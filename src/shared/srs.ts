/**
 * Character game SRS (Spaced Repetition System) and deck selection logic.
 *
 * This module is pure TypeScript and zero-dependency, safe to import
 * in both Cloudflare Pages Functions and browser-side React components.
 */

// ============================================================================
// 1. SRS Transition
// ============================================================================

/**
 * Calculates a character's new SRS level after an answer.
 * Levels are clamped to [0, 5].
 * - Correct: min(5, level + 1)
 * - Wrong: max(0, level - 1)
 *
 * Note: This live level is distinct from the remediation mastery counter.
 */
export function srsTransition(currentLevel: number, isCorrect: boolean): number {
  const level = Math.min(5, Math.max(0, Math.round(currentLevel)));
  return isCorrect ? Math.min(5, level + 1) : Math.max(0, level - 1);
}

// ============================================================================
// 2. Selection Weight
// ============================================================================

/**
 * Calculates the deck selection weight for a given SRS level.
 * Formula: (6 - srsLevel)^2 + 1
 *
 * Level 0 -> 37
 * Level 1 -> 26
 * Level 2 -> 17
 * Level 3 -> 10
 * Level 4 -> 5
 * Level 5 -> 2
 */
export function selectionWeight(srsLevel: number): number {
  const level = Math.min(5, Math.max(0, Math.round(srsLevel)));
  return (6 - level) ** 2 + 1;
}

// ============================================================================
// 3. Round Selection Abstraction (Weighted Shuffle Deck)
// ============================================================================

export interface RoundPoolMember {
  id: number;
  srsLevel: number;
  [key: string]: unknown;
}

export type RngFn = () => number;

/**
 * A stateful weighted-shuffle round picker that draws items one at a time.
 *
 * Guarantees:
 * 1. Full coverage before repeat: Every pool member is picked once before any
 *    pool member is picked a second time (for any run length up to pool size).
 * 2. Anti-repeat gap: No ID may repeat within `min(3, poolSize - 1)` picks of its
 *    most recent appearance, INCLUDING across deck refill boundaries.
 * 3. Weighted selection: Items with lower srsLevels (higher weights) are drawn
 *    with higher probability within candidate sets.
 * 4. Deterministic with injectable RNG (defaults to Math.random).
 */
export class RoundPicker<T extends RoundPoolMember> {
  private readonly pool: readonly T[];
  private readonly rng: RngFn;
  private readonly maxGap: number;
  private remainingDeck: T[] = [];
  private recentHistory: number[] = [];

  constructor(pool: readonly T[], rng: RngFn = Math.random) {
    if (!pool || pool.length === 0) {
      throw new Error('Cannot initialize RoundPicker with an empty pool.');
    }
    this.pool = [...pool];
    this.rng = rng;
    this.maxGap = Math.min(3, pool.length - 1);
    this.refillDeck();
  }

  private refillDeck(): void {
    this.remainingDeck = [...this.pool];
  }

  /**
   * Produces the next pick in the sequence.
   */
  next(): T {
    if (this.pool.length === 1) {
      return this.pool[0];
    }

    if (this.remainingDeck.length === 0) {
      this.refillDeck();
    }

    // Exclude IDs appearing in the recent-history window
    let candidates = this.remainingDeck.filter(
      (item) => !this.recentHistory.includes(item.id)
    );

    // Guaranteed mathematically that candidates.length >= 1, but fallback safely
    if (candidates.length === 0) {
      candidates = this.remainingDeck;
    }

    const selected = this.selectWeighted(candidates);

    // Remove selected item from current remaining deck
    const selectedIndex = this.remainingDeck.findIndex((item) => item.id === selected.id);
    if (selectedIndex !== -1) {
      this.remainingDeck.splice(selectedIndex, 1);
    }

    // Track sliding window of recent picks
    if (this.maxGap > 0) {
      this.recentHistory.push(selected.id);
      if (this.recentHistory.length > this.maxGap) {
        this.recentHistory.shift();
      }
    }

    return selected;
  }

  private selectWeighted(candidates: readonly T[]): T {
    if (candidates.length === 1) {
      return candidates[0];
    }

    let totalWeight = 0;
    for (const item of candidates) {
      totalWeight += selectionWeight(item.srsLevel);
    }

    const raw = this.rng();
    const clamped = typeof raw === 'number' && !Number.isNaN(raw)
      ? Math.min(Math.max(raw, 0), 1 - Number.EPSILON)
      : 0;

    let threshold = clamped * totalWeight;
    for (const item of candidates) {
      threshold -= selectionWeight(item.srsLevel);
      if (threshold <= 0) {
        return item;
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Resets the picker back to a full deck and clears recent history.
   */
  reset(): void {
    this.refillDeck();
    this.recentHistory = [];
  }
}

/**
 * Factory function to create a RoundPicker instance.
 */
export function createRoundPicker<T extends RoundPoolMember>(
  pool: readonly T[],
  rng: RngFn = Math.random
): RoundPicker<T> {
  return new RoundPicker(pool, rng);
}

// ============================================================================
// 4. Distractor Picker
// ============================================================================

export interface DistractorPoolMember {
  id: number;
  name: string;
  [key: string]: unknown;
}

/**
 * Picks `count` distractors for a target character from the given pool.
 *
 * Rules:
 * - Always excludes the target itself (by id).
 * - Always excludes any pool member whose name (trimmed and lowercased) equals
 *   the target's trimmed lowercased name.
 * - Uniformly picks `count` distinct candidates from the remaining valid pool.
 * - Throws a descriptive error if fewer than `count` valid candidates remain.
 */
export function pickDistractors<T extends DistractorPoolMember>(
  pool: readonly T[],
  target: { id: number; name: string },
  count: number,
  rng: RngFn = Math.random
): T[] {
  if (count < 0) {
    throw new Error(`Invalid distractor count: ${count}. Count cannot be negative.`);
  }

  const targetNormalizedName = target.name.trim().toLowerCase();

  const validCandidates = pool.filter(
    (item) => item.id !== target.id && item.name.trim().toLowerCase() !== targetNormalizedName
  );

  if (validCandidates.length < count) {
    throw new Error(
      `Cannot pick ${count} distractor(s): only ${validCandidates.length} valid candidate(s) remain in pool of ${pool.length} after excluding target (ID: ${target.id}, name: "${target.name}").`
    );
  }

  if (count === 0) {
    return [];
  }

  // Fisher-Yates partial shuffle to pick `count` distinct items uniformly
  const copy = [...validCandidates];
  const chosen: T[] = [];

  for (let i = 0; i < count; i++) {
    const remainingCount = copy.length - i;
    const raw = rng();
    const clamped = typeof raw === 'number' && !Number.isNaN(raw)
      ? Math.min(Math.max(raw, 0), 1 - Number.EPSILON)
      : 0;
    const randomIndex = i + Math.floor(clamped * remainingCount);

    const temp = copy[i];
    copy[i] = copy[randomIndex];
    copy[randomIndex] = temp;

    chosen.push(copy[i]);
  }

  return chosen;
}

// ============================================================================
// 5. Remediation Mastery Tracker
// ============================================================================

export const DEFAULT_REMEDIATION_MASTERY = 2;

/**
 * Pure transition function for remediation mastery counter.
 * Correct: increments counter, capped at masteryTarget.
 * Wrong: decrements counter by 1, floored at 0 (does NOT reset to 0).
 */
export function remediationTransition(
  currentMastery: number,
  isCorrect: boolean,
  masteryTarget: number = DEFAULT_REMEDIATION_MASTERY
): number {
  const target = Math.max(1, Math.floor(masteryTarget));
  const current = Math.min(target, Math.max(0, Math.floor(currentMastery)));
  return isCorrect ? Math.min(target, current + 1) : Math.max(0, current - 1);
}

/**
 * Tracks character mastery during the remediation phase.
 *
 * Features:
 * - Round-robin target selection (least-recently shown among unmastered).
 * - Mastery target: cumulative points (correct: +1 up to target, wrong: -1 down to 0).
 * - Characters reaching mastery target leave the rotation permanently.
 * - When only 1 character remains, keeps cycling that same character.
 * - Once all characters are mastered, nextTarget returns null and isComplete is true.
 */
export class RemediationTracker {
  private readonly initialIds: readonly number[];
  private readonly masteryCounts = new Map<number, number>();
  private readonly activeQueue: number[] = [];
  private readonly masteredSet = new Set<number>();
  private readonly masteryTarget: number;

  constructor(
    missedIds: readonly number[],
    masteryTarget: number = DEFAULT_REMEDIATION_MASTERY
  ) {
    this.masteryTarget = Math.max(1, Math.floor(masteryTarget));
    // Deduplicate while preserving order of initial appearance
    const seen = new Set<number>();
    const unique: number[] = [];
    for (const id of missedIds) {
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(id);
      }
    }
    this.initialIds = unique;
    for (const id of unique) {
      this.masteryCounts.set(id, 0);
      this.activeQueue.push(id);
    }
  }

  getMasteryTarget(): number {
    return this.masteryTarget;
  }

  /**
   * Returns the next target ID to show in round-robin order.
   * Returns null if and only if remediation is complete (all characters mastered).
   */
  getNextTarget(): number | null {
    if (this.activeQueue.length === 0) {
      return null;
    }
    return this.activeQueue[0];
  }

  get nextTarget(): number | null {
    return this.getNextTarget();
  }

  /**
   * Applies an answer for a character in remediation.
   */
  applyAnswer(characterId: number, isCorrect: boolean): void {
    if (this.masteredSet.has(characterId) || !this.masteryCounts.has(characterId)) {
      return;
    }

    const currentCount = this.masteryCounts.get(characterId) ?? 0;
    const newCount = remediationTransition(currentCount, isCorrect, this.masteryTarget);
    this.masteryCounts.set(characterId, newCount);

    if (newCount >= this.masteryTarget) {
      this.masteredSet.add(characterId);
      const queueIndex = this.activeQueue.indexOf(characterId);
      if (queueIndex !== -1) {
        this.activeQueue.splice(queueIndex, 1);
      }
    } else {
      // Re-queue to the back of the round-robin line
      const queueIndex = this.activeQueue.indexOf(characterId);
      if (queueIndex !== -1) {
        this.activeQueue.splice(queueIndex, 1);
      }
      this.activeQueue.push(characterId);
    }
  }

  recordAnswer(characterId: number, isCorrect: boolean): void {
    this.applyAnswer(characterId, isCorrect);
  }

  getMastery(characterId: number): number {
    return this.masteryCounts.get(characterId) ?? 0;
  }

  getMasteryCount(characterId: number): number {
    return this.getMastery(characterId);
  }

  isMastered(characterId: number): boolean {
    return this.masteredSet.has(characterId);
  }

  isComplete(): boolean {
    return this.activeQueue.length === 0;
  }

  getActiveCount(): number {
    return this.activeQueue.length;
  }

  getMasteredCount(): number {
    return this.masteredSet.size;
  }

  getTotalCount(): number {
    return this.initialIds.length;
  }

  getActiveIds(): number[] {
    return [...this.activeQueue];
  }

  getMasteredIds(): number[] {
    return [...this.masteredSet];
  }
}

export function createRemediationTracker(
  missedIds: readonly number[],
  masteryTarget: number = DEFAULT_REMEDIATION_MASTERY
): RemediationTracker {
  return new RemediationTracker(missedIds, masteryTarget);
}

// ============================================================================
// 6. Learning Engine Types and Constants
// ============================================================================

export type RoundMode = 'classic' | 'match';
export type Fluency = 'lightning' | 'fluent' | 'hesitant';
export type HeatCellState = 'mastered' | 'solid' | 'learning' | 'critical' | 'unseen';

export interface ConfusionEntry {
  id: number;
  count: number;
}

export interface FluencyThresholds {
  lightning: number;
  fluent: number;
}

export interface PromotionDecision {
  srsLevelAfter: number;
  hesitantStreak: number;
  blocked: boolean;
}

export interface LeechInput {
  correctCount: number;
  wrongCount: number;
  isLeech: boolean;
  leechStreak: number;
}

export interface LeechState {
  isLeech: boolean;
  leechStreak: number;
}

export const BASE_INTERVAL_HOURS: readonly number[] = [0, 4, 24, 72, 168, 720];
export const MAX_INTERVAL_HOURS = 2160;             // 90 days
export const WRONG_ANSWER_INTERVAL_HOURS = 4;
export const LIGHTNING_INTERVAL_MULTIPLIER = 1.3;
export const MIN_LATENCY_SAMPLES = 12;
export const MAX_SCORABLE_ELAPSED_MS = 60000;
export const MAX_HESITANT_BLOCKS = 2;
export const LEECH_MIN_WRONG = 4;
export const LEECH_MAX_ACCURACY = 0.5;
export const LEECH_GRADUATION_STREAK = 3;
export const CONFUSION_BIAS: Readonly<Record<RoundMode, number>> = { classic: 0.6, match: 0.4 };
export const MIN_CONFUSION_COUNT = 2;

// ============================================================================
// 7. Scheduling (Ebbinghaus Intervals)
// ============================================================================

/**
 * Computes the next review interval in hours based on SRS level, previous interval,
 * answer correctness, and fluency.
 */
export function nextIntervalHours(
  srsLevelAfter: number,
  previousIntervalHours: number | null,
  isCorrect: boolean,
  fluency: Fluency | null = null
): number {
  if (!isCorrect) {
    return WRONG_ANSWER_INTERVAL_HOURS;
  }

  const level = Math.min(5, Math.max(0, Math.round(srsLevelAfter)));
  let base: number;
  if (level < 5) {
    base = BASE_INTERVAL_HOURS[level];
  } else {
    base = Math.max(720, (previousIntervalHours ?? 0) * 2);
  }

  if (fluency === 'lightning') {
    base *= LIGHTNING_INTERVAL_MULTIPLIER;
  }

  return Math.min(MAX_INTERVAL_HOURS, base);
}

/**
 * Computes the next review ISO timestamp given an interval in hours from nowIso.
 * Negative or NaN interval is treated as 0.
 */
export function computeNextReviewAt(nowIso: string, intervalHours: number): string {
  const safeHours = typeof intervalHours === 'number' && Number.isFinite(intervalHours) && intervalHours > 0
    ? intervalHours
    : 0;
  return new Date(Date.parse(nowIso) + safeHours * 3600_000).toISOString();
}

/**
 * Checks whether an item is due for review as of nowIso.
 * Returns false if nextReviewAtIso is null or unparseable.
 */
export function isDue(nextReviewAtIso: string | null, nowIso: string): boolean {
  if (!nextReviewAtIso) {
    return false;
  }
  const nextTime = Date.parse(nextReviewAtIso);
  const nowTime = Date.parse(nowIso);
  if (Number.isNaN(nextTime) || Number.isNaN(nowTime)) {
    return false;
  }
  return nextTime <= nowTime;
}

/**
 * Calculates how many hours overdue an item is as of nowIso.
 * Returns 0 if null, unparseable, or not yet due.
 */
export function hoursOverdue(nextReviewAtIso: string | null, nowIso: string): number {
  if (!nextReviewAtIso) {
    return 0;
  }
  const nextTime = Date.parse(nextReviewAtIso);
  const nowTime = Date.parse(nowIso);
  if (Number.isNaN(nextTime) || Number.isNaN(nowTime)) {
    return 0;
  }
  const diffMs = nowTime - nextTime;
  if (diffMs <= 0) {
    return 0;
  }
  return diffMs / 3600_000;
}

// ============================================================================
// 8. Latency and Fluency Classification
// ============================================================================

/**
 * Calculates the median of an array of numeric latency samples.
 * Returns null if the array is empty or contains no finite values.
 */
export function medianMs(samples: readonly number[]): number | null {
  const valid = samples.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (valid.length === 0) {
    return null;
  }
  valid.sort((a, b) => a - b);
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) {
    return valid[mid];
  }
  return (valid[mid - 1] + valid[mid]) / 2;
}

/**
 * Derives personal fluency thresholds from a user's median latency baseline.
 * Returns null if baseline is non-positive/null or sample count < MIN_LATENCY_SAMPLES.
 */
export function deriveFluencyThresholds(
  baselineMedianMs: number | null,
  sampleCount: number
): FluencyThresholds | null {
  if (
    baselineMedianMs === null ||
    !Number.isFinite(baselineMedianMs) ||
    baselineMedianMs <= 0 ||
    sampleCount < MIN_LATENCY_SAMPLES
  ) {
    return null;
  }
  return {
    lightning: baselineMedianMs * 0.6,
    fluent: baselineMedianMs * 1.6,
  };
}

/**
 * Classifies an answer's recall latency into a Fluency tier.
 */
export function classifyFluency(
  elapsedMs: number | null,
  thresholds: FluencyThresholds | null
): Fluency | null {
  if (
    elapsedMs === null ||
    typeof elapsedMs !== 'number' ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    thresholds === null
  ) {
    return null;
  }
  if (elapsedMs > MAX_SCORABLE_ELAPSED_MS) {
    return 'hesitant';
  }
  if (elapsedMs <= thresholds.lightning) {
    return 'lightning';
  }
  if (elapsedMs <= thresholds.fluent) {
    return 'fluent';
  }
  return 'hesitant';
}

/**
 * Determines SRS level promotion and hesitant streak handling based on fluency.
 */
export function applyFluencyToPromotion(
  levelBefore: number,
  isCorrect: boolean,
  fluency: Fluency | null,
  hesitantStreak: number,
  maxBlocks: number = MAX_HESITANT_BLOCKS
): PromotionDecision {
  if (!isCorrect) {
    return {
      srsLevelAfter: srsTransition(levelBefore, false),
      hesitantStreak: 0,
      blocked: false,
    };
  }

  if (fluency !== 'hesitant') {
    return {
      srsLevelAfter: srsTransition(levelBefore, true),
      hesitantStreak: 0,
      blocked: false,
    };
  }

  if (hesitantStreak < maxBlocks) {
    return {
      srsLevelAfter: levelBefore,
      hesitantStreak: hesitantStreak + 1,
      blocked: true,
    };
  }

  return {
    srsLevelAfter: srsTransition(levelBefore, true),
    hesitantStreak: 0,
    blocked: false,
  };
}

// ============================================================================
// 9. Leech Detection
// ============================================================================

/**
 * Calculates leech status and streak progression after an answer.
 */
export function leechTransition(
  input: LeechInput,
  isCorrectMainAnswer: boolean | null,
  opts?: { minWrong?: number; maxAccuracy?: number; graduationStreak?: number }
): LeechState {
  if (isCorrectMainAnswer === null) {
    return { isLeech: input.isLeech, leechStreak: input.leechStreak };
  }

  const minWrong = opts?.minWrong ?? LEECH_MIN_WRONG;
  const maxAccuracy = opts?.maxAccuracy ?? LEECH_MAX_ACCURACY;
  const graduationStreak = opts?.graduationStreak ?? LEECH_GRADUATION_STREAK;

  if (!isCorrectMainAnswer) {
    const total = input.correctCount + input.wrongCount;
    const accuracy = total > 0 ? input.correctCount / total : 1;
    const isLeech = input.isLeech || (input.wrongCount >= minWrong && accuracy < maxAccuracy);
    return { isLeech, leechStreak: 0 };
  }

  const streak = input.leechStreak + 1;
  if (input.isLeech && streak >= graduationStreak) {
    return { isLeech: false, leechStreak: 0 };
  }

  return { isLeech: input.isLeech, leechStreak: streak };
}

// ============================================================================
// 10. Heatmap Cell State
// ============================================================================

/**
 * Determines the visual heatmap state for a character cell.
 */
export function heatCellState(
  input: {
    srsLevel: number;
    correctCount: number;
    wrongCount: number;
    isLeech: boolean;
    nextReviewAt: string | null;
  },
  nowIso: string
): HeatCellState {
  if (input.correctCount + input.wrongCount === 0) {
    return 'unseen';
  }
  if (input.isLeech || isDue(input.nextReviewAt, nowIso)) {
    return 'critical';
  }
  if (input.srsLevel >= 5) {
    return 'mastered';
  }
  if (input.srsLevel === 4) {
    return 'solid';
  }
  return 'learning';
}

// ============================================================================
// 11. Confusion-Weighted Distractors
// ============================================================================

/**
 * Picks `count` distractors with probability-weighted bias towards frequently confused characters.
 * Calls `pickDistractors` for underlying distractor selection.
 */
export function pickDistractorsWeighted<T extends DistractorPoolMember>(
  pool: readonly T[],
  target: { id: number; name: string },
  count: number,
  confusion: readonly ConfusionEntry[] = [],
  rng: RngFn = Math.random,
  biasProbability = 0.6
): T[] {
  if (count < 0) {
    throw new Error(`Invalid distractor count: ${count}. Count cannot be negative.`);
  }

  const targetNormalizedName = target.name.trim().toLowerCase();

  const validCandidates = pool.filter(
    (item) => item.id !== target.id && item.name.trim().toLowerCase() !== targetNormalizedName
  );

  if (validCandidates.length < count) {
    throw new Error(
      `Cannot pick ${count} distractor(s): only ${validCandidates.length} valid candidate(s) remain in pool of ${pool.length} after excluding target (ID: ${target.id}, name: "${target.name}").`
    );
  }

  if (count === 0) {
    return [];
  }

  const candidateMap = new Map<number, T>();
  for (const c of validCandidates) {
    candidateMap.set(c.id, c);
  }

  const partners = confusion.filter(
    (entry) => entry.count >= MIN_CONFUSION_COUNT && candidateMap.has(entry.id)
  );

  if (partners.length === 0) {
    return pickDistractors(pool, target, count, rng);
  }

  const coin = rng();
  if (coin >= biasProbability) {
    return pickDistractors(pool, target, count, rng);
  }

  let totalWeight = 0;
  for (const p of partners) {
    totalWeight += p.count;
  }

  const raw = rng();
  const clamped = typeof raw === 'number' && !Number.isNaN(raw)
    ? Math.min(Math.max(raw, 0), 1 - Number.EPSILON)
    : 0;

  let chosenEntry = partners[partners.length - 1];
  let threshold = clamped * totalWeight;
  for (const p of partners) {
    threshold -= p.count;
    if (threshold <= 0) {
      chosenEntry = p;
      break;
    }
  }

  const chosenPartner = candidateMap.get(chosenEntry.id)!;
  const poolWithoutChosen = pool.filter((item) => item.id !== chosenPartner.id);
  const rest = pickDistractors(poolWithoutChosen, target, count - 1, rng);

  return [chosenPartner, ...rest];
}

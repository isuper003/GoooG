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
 * - Wrong: max(0, level - 2)
 *
 * Note: This live level is distinct from the remediation mastery counter.
 */
export function srsTransition(currentLevel: number, isCorrect: boolean): number {
  const level = Math.min(5, Math.max(0, Math.round(currentLevel)));
  return isCorrect ? Math.min(5, level + 1) : Math.max(0, level - 2);
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

/**
 * Pure transition function for remediation mastery counter.
 * Correct: increments counter, capped at 2.
 * Wrong: decrements counter by 1, floored at 0 (does NOT reset to 0).
 */
export function remediationTransition(currentMastery: number, isCorrect: boolean): number {
  const current = Math.min(2, Math.max(0, Math.floor(currentMastery)));
  return isCorrect ? Math.min(2, current + 1) : Math.max(0, current - 1);
}

/**
 * Tracks character mastery during the remediation phase.
 *
 * Features:
 * - Round-robin target selection (least-recently shown among unmastered).
 * - Mastery target: 2 cumulative points (correct: +1 up to 2, wrong: -1 down to 0).
 * - Characters reaching 2 mastery points leave the rotation permanently.
 * - When only 1 character remains, keeps cycling that same character.
 * - Once all characters are mastered, nextTarget returns null and isComplete is true.
 */
export class RemediationTracker {
  private readonly initialIds: readonly number[];
  private readonly masteryCounts = new Map<number, number>();
  private readonly activeQueue: number[] = [];
  private readonly masteredSet = new Set<number>();

  constructor(missedIds: readonly number[]) {
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
    const newCount = remediationTransition(currentCount, isCorrect);
    this.masteryCounts.set(characterId, newCount);

    if (newCount >= 2) {
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

export function createRemediationTracker(missedIds: readonly number[]): RemediationTracker {
  return new RemediationTracker(missedIds);
}

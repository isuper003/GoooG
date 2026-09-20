import { describe, it, expect } from 'vitest';
import {
  srsTransition,
  selectionWeight,
  RoundPicker,
  createRoundPicker,
  pickDistractors,
  remediationTransition,
  RemediationTracker,
  createRemediationTracker,
  DEFAULT_REMEDIATION_MASTERY,
  BASE_INTERVAL_HOURS,
  MAX_INTERVAL_HOURS,
  WRONG_ANSWER_INTERVAL_HOURS,
  LIGHTNING_INTERVAL_MULTIPLIER,
  MIN_LATENCY_SAMPLES,
  MAX_SCORABLE_ELAPSED_MS,
  MAX_HESITANT_BLOCKS,
  LEECH_MIN_WRONG,
  LEECH_MAX_ACCURACY,
  LEECH_GRADUATION_STREAK,
  CONFUSION_BIAS,
  MIN_CONFUSION_COUNT,
  nextIntervalHours,
  computeNextReviewAt,
  isDue,
  hoursOverdue,
  medianMs,
  deriveFluencyThresholds,
  classifyFluency,
  applyFluencyToPromotion,
  leechTransition,
  heatCellState,
  pickDistractorsWeighted,
} from './srs';

/**
 * Deterministic pseudo-random number generator (Mulberry32) for reproducible tests.
 * Generates numbers in [0, 1).
 */
function createSeededRng(seed = 123456789): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('srsTransition', () => {
  it('floors at 0 on repeated wrong answers from a low level', () => {
    expect(srsTransition(0, false)).toBe(0);
    expect(srsTransition(1, false)).toBe(0);

    // Repeated wrong answers from 0 stay at 0
    let level = 0;
    for (let i = 0; i < 5; i++) {
      level = srsTransition(level, false);
      expect(level).toBe(0);
    }
  });

  it('caps at 5 on repeated correct answers from a high level', () => {
    expect(srsTransition(4, true)).toBe(5);
    expect(srsTransition(5, true)).toBe(5);

    // Repeated correct answers from 4 stay capped at 5
    let level = 4;
    for (let i = 0; i < 5; i++) {
      level = srsTransition(level, true);
      expect(level).toBe(5);
    }
  });

  it('handles ordinary transitions correctly', () => {
    expect(srsTransition(2, true)).toBe(3);
    expect(srsTransition(3, false)).toBe(2);
    expect(srsTransition(0, true)).toBe(1);
    expect(srsTransition(5, false)).toBe(4);
  });

  it('matches a hand-computed alternating correct/wrong sequence', () => {
    // Sequence starting at level 2:
    // 1. correct:  2 -> 3
    // 2. wrong:    3 -> 2
    // 3. correct:  2 -> 3
    // 4. correct:  3 -> 4
    // 5. wrong:    4 -> 3
    // 6. wrong:    3 -> 2
    // 7. wrong:    2 -> 1
    // 8. correct:  1 -> 2
    // 9. correct:  2 -> 3
    // 10. correct: 3 -> 4
    // 11. correct: 4 -> 5
    // 12. correct: 5 -> 5 (capped)
    // 13. correct: 5 -> 5 (capped)
    // 14. wrong:   5 -> 4
    const answers = [
      true,  // 3
      false, // 2
      true,  // 3
      true,  // 4
      false, // 3
      false, // 2
      false, // 1
      true,  // 2
      true,  // 3
      true,  // 4
      true,  // 5
      true,  // 5
      true,  // 5
      false, // 4
    ];

    let level = 2;
    for (const ans of answers) {
      level = srsTransition(level, ans);
    }

    expect(level).toBe(4);
  });
});

describe('selectionWeight', () => {
  it('strictly decreases as srsLevel goes 0 -> 5', () => {
    const weights: number[] = [];
    for (let level = 0; level <= 5; level++) {
      weights.push(selectionWeight(level));
    }

    // Exact expected values: (6 - level)^2 + 1
    expect(weights).toEqual([37, 26, 17, 10, 5, 2]);

    // Strictly decreasing check
    for (let i = 0; i < weights.length - 1; i++) {
      expect(weights[i]).toBeGreaterThan(weights[i + 1]);
    }
  });
});

describe('RoundPicker (round-selection abstraction)', () => {
  it('throws when initialized with an empty pool', () => {
    expect(() => new RoundPicker([])).toThrow('Cannot initialize RoundPicker with an empty pool');
  });

  it('works for a pool of size 1 without crashing or deadlocking', () => {
    const picker = new RoundPicker([{ id: 99, srsLevel: 0 }]);
    for (let i = 0; i < 10; i++) {
      expect(picker.next().id).toBe(99);
    }
  });

  it('guarantees full pool coverage before any repeat for a run equal to pool size', () => {
    const pool = [
      { id: 1, srsLevel: 0 },
      { id: 2, srsLevel: 1 },
      { id: 3, srsLevel: 2 },
      { id: 4, srsLevel: 3 },
      { id: 5, srsLevel: 4 },
      { id: 6, srsLevel: 5 },
      { id: 7, srsLevel: 0 },
      { id: 8, srsLevel: 2 },
    ];

    const picker = new RoundPicker(pool);
    const seenIds = new Set<number>();

    for (let i = 0; i < pool.length; i++) {
      const pick = picker.next();
      expect(seenIds.has(pick.id)).toBe(false);
      seenIds.add(pick.id);
    }

    expect(seenIds.size).toBe(pool.length);
    for (const member of pool) {
      expect(seenIds.has(member.id)).toBe(true);
    }
  });

  it('asserts the minimum-gap rule holds at every single position across deck refills for a small pool (size 3)', () => {
    const pool = [
      { id: 101, srsLevel: 0 },
      { id: 102, srsLevel: 3 },
      { id: 103, srsLevel: 5 },
    ];
    const minGap = Math.min(3, pool.length - 1); // min(3, 2) = 2
    expect(minGap).toBe(2);

    const picker = new RoundPicker(pool, createSeededRng(987654321));
    const picks: { id: number; srsLevel: number }[] = [];

    // Run for 30 picks (10 full deck cycles)
    for (let i = 0; i < 30; i++) {
      picks.push(picker.next());
    }

    // Verify minimum gap rule at every single position
    for (let i = 0; i < picks.length; i++) {
      for (let k = 1; k <= minGap; k++) {
        if (i - k >= 0) {
          expect(picks[i].id).not.toBe(picks[i - k].id);
        }
      }
    }
  });

  it('asserts the minimum-gap rule holds at every single position across deck refills for a small pool (size 4)', () => {
    const pool = [
      { id: 1, srsLevel: 0 },
      { id: 2, srsLevel: 1 },
      { id: 3, srsLevel: 4 },
      { id: 4, srsLevel: 5 },
    ];
    const minGap = Math.min(3, pool.length - 1); // min(3, 3) = 3
    expect(minGap).toBe(3);

    const picker = createRoundPicker(pool, createSeededRng(11223344));
    const picks: { id: number; srsLevel: number }[] = [];

    // Run for 32 picks (8 full deck cycles)
    for (let i = 0; i < 32; i++) {
      picks.push(picker.next());
    }

    // Verify minimum gap of 3 at every single position
    for (let i = 0; i < picks.length; i++) {
      for (let k = 1; k <= minGap; k++) {
        if (i - k >= 0) {
          expect(picks[i].id).not.toBe(picks[i - k].id);
        }
      }
    }
  });

  it('demonstrates directional weighting over a large sample (thousands of picks) using a seeded RNG', () => {
    // 5 characters with level 0 (weight 37 each), 5 characters with level 5 (weight 2 each)
    const pool = [
      { id: 1, srsLevel: 0 },
      { id: 2, srsLevel: 0 },
      { id: 3, srsLevel: 0 },
      { id: 4, srsLevel: 0 },
      { id: 5, srsLevel: 0 },
      { id: 6, srsLevel: 5 },
      { id: 7, srsLevel: 5 },
      { id: 8, srsLevel: 5 },
      { id: 9, srsLevel: 5 },
      { id: 10, srsLevel: 5 },
    ];

    const rng = createSeededRng(424242);
    const pickCounts = new Map<number, number>();
    for (const member of pool) {
      pickCounts.set(member.id, 0);
    }

    // Simulate 1,500 game sessions drawing the first 3 rounds from a fresh weighted deck (4,500 picks total)
    const sessions = 1500;
    const roundsPerSession = 3;

    for (let s = 0; s < sessions; s++) {
      const picker = new RoundPicker(pool, rng);
      for (let r = 0; r < roundsPerSession; r++) {
        const picked = picker.next();
        pickCounts.set(picked.id, (pickCounts.get(picked.id) ?? 0) + 1);
      }
    }

    let level0Total = 0;
    for (let id = 1; id <= 5; id++) {
      level0Total += pickCounts.get(id) ?? 0;
    }

    let level5Total = 0;
    for (let id = 6; id <= 10; id++) {
      level5Total += pickCounts.get(id) ?? 0;
    }

    // Directional assertion: level 0 picks must exceed level 5 picks by a comfortable margin
    expect(level0Total).toBeGreaterThan(level5Total * 3);

    // Every single level 0 character has meaningfully more picks than every level 5 character
    for (let id0 = 1; id0 <= 5; id0++) {
      for (let id5 = 6; id5 <= 10; id5++) {
        expect(pickCounts.get(id0)!).toBeGreaterThan(pickCounts.get(id5)!);
      }
    }
  });

  it('biases earlier positions in a deck toward lower SRS levels', () => {
    // In a single full pass of 6 characters (levels 0 through 5),
    // characters with lower SRS level should have a lower average position index.
    const pool = [
      { id: 0, srsLevel: 0 },
      { id: 1, srsLevel: 1 },
      { id: 2, srsLevel: 2 },
      { id: 3, srsLevel: 3 },
      { id: 4, srsLevel: 4 },
      { id: 5, srsLevel: 5 },
    ];

    const rng = createSeededRng(55555);
    const totalPositions = [0, 0, 0, 0, 0, 0];
    const runs = 1000;

    for (let r = 0; r < runs; r++) {
      const picker = new RoundPicker(pool, rng);
      for (let pos = 0; pos < pool.length; pos++) {
        const item = picker.next();
        totalPositions[item.id] += pos;
      }
    }

    const avgPositions = totalPositions.map((tot) => tot / runs);

    // Lower SRS levels should on average be picked earlier (lower average position index)
    // Level 0 should appear earlier on average than Level 5 by a comfortable margin
    expect(avgPositions[0]).toBeLessThan(avgPositions[5] - 1.0);
    expect(avgPositions[0]).toBeLessThan(avgPositions[3]);
    expect(avgPositions[1]).toBeLessThan(avgPositions[5]);
  });
});

describe('pickDistractors', () => {
  const pool = [
    { id: 1, name: 'Spike Spiegel' },
    { id: 2, name: 'Faye Valentine' },
    { id: 3, name: 'Jet Black' },
    { id: 4, name: 'Edward Wong' },
    { id: 5, name: 'Ein' },
    { id: 6, name: 'Vicious' },
    { id: 7, name: 'Julia' },
  ];

  it('excludes the target itself', () => {
    const target = { id: 2, name: 'Faye Valentine' };
    const distractors = pickDistractors(pool, target, 3);

    expect(distractors.length).toBe(3);
    for (const d of distractors) {
      expect(d.id).not.toBe(target.id);
    }
  });

  it('excludes a same-name-different-case decoy', () => {
    const poolWithDecoy = [
      { id: 10, name: 'Asuka Langley' },
      { id: 11, name: '  asuka langley  ' }, // Same name, different case and whitespace
      { id: 12, name: 'Shinji Ikari' },
      { id: 13, name: 'Rei Ayanami' },
    ];

    const target = { id: 10, name: 'Asuka Langley' };
    const distractors = pickDistractors(poolWithDecoy, target, 2);

    expect(distractors.length).toBe(2);
    const ids = distractors.map((d) => d.id);
    expect(ids).not.toContain(10);
    expect(ids).not.toContain(11);
    expect(ids).toContain(12);
    expect(ids).toContain(13);
  });

  it('throws when the pool cannot satisfy the requested count after exclusions', () => {
    const smallPool = [
      { id: 1, name: 'Goku' },
      { id: 2, name: '  goku  ' },
      { id: 3, name: 'Vegeta' },
    ];

    const target = { id: 1, name: 'Goku' };

    // Only 1 candidate ('Vegeta') remains after excluding target and decoy
    expect(() => pickDistractors(smallPool, target, 2)).toThrow(/Cannot pick 2 distractor/);
  });

  it('throws on negative distractor count', () => {
    expect(() => pickDistractors(pool, pool[0], -1)).toThrow(/Invalid distractor count/);
  });

  it('returns empty array when count is 0', () => {
    expect(pickDistractors(pool, pool[0], 0)).toEqual([]);
  });

  it('picks distinct items deterministically with an injected RNG', () => {
    const target = pool[0];
    const rng1 = createSeededRng(12345);
    const rng2 = createSeededRng(12345);

    const res1 = pickDistractors(pool, target, 4, rng1);
    const res2 = pickDistractors(pool, target, 4, rng2);

    expect(res1).toEqual(res2);
    expect(new Set(res1.map((d) => d.id)).size).toBe(4);
  });
});

describe('remediationTransition', () => {
  it('increments counter on correct up to cap of 2', () => {
    expect(remediationTransition(0, true)).toBe(1);
    expect(remediationTransition(1, true)).toBe(2);
    expect(remediationTransition(2, true)).toBe(2);
  });

  it('decrements counter by 1 on wrong down to floor of 0 without resetting', () => {
    expect(remediationTransition(2, false)).toBe(1);
    expect(remediationTransition(1, false)).toBe(0);
    expect(remediationTransition(0, false)).toBe(0);
  });
});

describe('RemediationTracker', () => {
  it('handles empty missed list immediately as complete', () => {
    const tracker = new RemediationTracker([]);
    expect(tracker.isComplete()).toBe(true);
    expect(tracker.getNextTarget()).toBeNull();
    expect(tracker.nextTarget).toBeNull();
  });

  it('handles single character remediation cleanly until mastered', () => {
    const tracker = createRemediationTracker([42]);
    expect(tracker.isComplete()).toBe(false);
    expect(tracker.nextTarget).toBe(42);

    // Wrong answer at 0: stays 0, still nextTarget 42
    tracker.applyAnswer(42, false);
    expect(tracker.getMastery(42)).toBe(0);
    expect(tracker.nextTarget).toBe(42);
    expect(tracker.isComplete()).toBe(false);

    // Correct answer: 0 -> 1, still nextTarget 42
    tracker.applyAnswer(42, true);
    expect(tracker.getMastery(42)).toBe(1);
    expect(tracker.nextTarget).toBe(42);
    expect(tracker.isComplete()).toBe(false);

    // Correct answer: 1 -> 2 (mastered!), complete
    tracker.applyAnswer(42, true);
    expect(tracker.getMastery(42)).toBe(2);
    expect(tracker.isComplete()).toBe(true);
    expect(tracker.nextTarget).toBeNull();

    // Call once more after completion
    expect(tracker.nextTarget).toBeNull();
    expect(tracker.isComplete()).toBe(true);
  });

  it('deduplicates missed IDs while preserving order', () => {
    const tracker = new RemediationTracker([10, 20, 10, 30, 20]);
    expect(tracker.getTotalCount()).toBe(3);
    expect(tracker.getActiveCount()).toBe(3);
    expect(tracker.getActiveIds()).toEqual([10, 20, 30]);
    expect(tracker.nextTarget).toBe(10);
  });

  it('runs a full scripted walkthrough with 3 missed characters to mastery', () => {
    // 3 missed characters: 1, 2, 3
    const tracker = new RemediationTracker([1, 2, 3]);

    // Initial state check
    expect(tracker.isComplete()).toBe(false);
    expect(tracker.nextTarget).toBe(1);
    expect(tracker.getMastery(1)).toBe(0);
    expect(tracker.getMastery(2)).toBe(0);
    expect(tracker.getMastery(3)).toBe(0);

    // Step 1: Target is 1. Answer: Correct.
    // 1's counter: 0 -> 1. Rotation order: 2, 3, 1.
    tracker.applyAnswer(1, true);
    expect(tracker.getMastery(1)).toBe(1);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    // Step 2: Target is 2. Answer: Correct.
    // 2's counter: 0 -> 1. Rotation order: 3, 1, 2.
    tracker.applyAnswer(2, true);
    expect(tracker.getMastery(2)).toBe(1);
    expect(tracker.nextTarget).toBe(3);
    expect(tracker.isComplete()).toBe(false);

    // Step 3: Target is 3. Answer: Wrong.
    // 3's counter: max(0, 0 - 1) = 0. Rotation order: 1, 2, 3.
    tracker.applyAnswer(3, false);
    expect(tracker.getMastery(3)).toBe(0);
    expect(tracker.nextTarget).toBe(1);
    expect(tracker.isComplete()).toBe(false);

    // Step 4: Target is 1. Answer: Correct.
    // 1's counter: 1 -> 2 (MASTERED!).
    // 1 permanently leaves rotation! Active remaining: [2, 3].
    tracker.applyAnswer(1, true);
    expect(tracker.getMastery(1)).toBe(2);
    expect(tracker.isMastered(1)).toBe(true);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    // Step 5: Target is 2. Answer: Wrong.
    // 2's counter: 1 -> 0 (decrements by 1, does NOT reset to 0 if higher or do anything else).
    // Rotation order: 3, 2.
    tracker.applyAnswer(2, false);
    expect(tracker.getMastery(2)).toBe(0);
    expect(tracker.nextTarget).toBe(3);
    expect(tracker.isComplete()).toBe(false);

    // Step 6: Target is 3. Answer: Correct.
    // 3's counter: 0 -> 1. Rotation order: 2, 3.
    tracker.applyAnswer(3, true);
    expect(tracker.getMastery(3)).toBe(1);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    // Step 7: Target is 2. Answer: Correct.
    // 2's counter: 0 -> 1. Rotation order: 3, 2.
    tracker.applyAnswer(2, true);
    expect(tracker.getMastery(2)).toBe(1);
    expect(tracker.nextTarget).toBe(3);
    expect(tracker.isComplete()).toBe(false);

    // Step 8: Target is 3. Answer: Correct.
    // 3's counter: 1 -> 2 (MASTERED!).
    // 3 permanently leaves rotation! Active remaining: [2].
    // ONLY ONE character remains active now: character 2!
    tracker.applyAnswer(3, true);
    expect(tracker.getMastery(3)).toBe(2);
    expect(tracker.isMastered(3)).toBe(true);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.getActiveCount()).toBe(1);
    expect(tracker.isComplete()).toBe(false);

    // Step 9: Only character 2 active. Target is 2. Answer: Wrong.
    // 2's counter: 1 -> 0.
    // Must keep cycling back to 2!
    tracker.applyAnswer(2, false);
    expect(tracker.getMastery(2)).toBe(0);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    // Step 10: Target is 2. Answer: Correct.
    // 2's counter: 0 -> 1. Still cycling back to 2.
    tracker.applyAnswer(2, true);
    expect(tracker.getMastery(2)).toBe(1);
    expect(tracker.nextTarget).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    // Step 11: Target is 2. Answer: Correct.
    // 2's counter: 1 -> 2 (MASTERED!).
    // 2 leaves rotation! All characters mastered!
    tracker.applyAnswer(2, true);
    expect(tracker.getMastery(2)).toBe(2);
    expect(tracker.isMastered(2)).toBe(true);

    // Check completion
    expect(tracker.isComplete()).toBe(true);
    expect(tracker.nextTarget).toBeNull();
    expect(tracker.getNextTarget()).toBeNull();
    expect(tracker.getActiveCount()).toBe(0);
    expect(tracker.getMasteredCount()).toBe(3);

    // Call once more after completion to confirm it stays null, not just transiently so
    expect(tracker.nextTarget).toBeNull();
    expect(tracker.getNextTarget()).toBeNull();
    expect(tracker.isComplete()).toBe(true);

    // Attempting to re-apply an answer for an already mastered character must not resurrect it
    tracker.applyAnswer(2, false);
    expect(tracker.nextTarget).toBeNull();
    expect(tracker.isComplete()).toBe(true);
    expect(tracker.getMastery(2)).toBe(2);
  });
});

describe('pickDistractorsWeighted', () => {
  const pool = [
    { id: 1, name: 'Spike Spiegel' },
    { id: 2, name: 'Faye Valentine' },
    { id: 3, name: 'Jet Black' },
    { id: 4, name: 'Edward Wong' },
    { id: 5, name: 'Ein' },
    { id: 6, name: 'Vicious' },
    { id: 7, name: 'Julia' },
  ];
  const target = { id: 1, name: 'Spike Spiegel' };

  it('returns exactly the same result as pickDistractors when confusion is empty (no regression)', () => {
    const rng1 = createSeededRng(12345);
    const rng2 = createSeededRng(12345);

    const unweighted = pickDistractors(pool, target, 2, rng1);
    const weighted = pickDistractorsWeighted(pool, target, 2, [], rng2);

    expect(weighted).toEqual(unweighted);
  });

  it('delegates identically when confusion partner is not in pool or count is below MIN_CONFUSION_COUNT', () => {
    // Partner not in pool
    const rng1 = createSeededRng(23456);
    const rng2 = createSeededRng(23456);
    const resNotInPool = pickDistractorsWeighted(pool, target, 2, [{ id: 999, count: 10 }], rng1);
    const unweighted1 = pickDistractors(pool, target, 2, rng2);
    expect(resNotInPool).toEqual(unweighted1);

    // Count below MIN_CONFUSION_COUNT (MIN_CONFUSION_COUNT = 2)
    const rng3 = createSeededRng(34567);
    const rng4 = createSeededRng(34567);
    const resBelowMin = pickDistractorsWeighted(pool, target, 2, [{ id: 2, count: 1 }], rng3);
    const unweighted2 = pickDistractors(pool, target, 2, rng4);
    expect(resBelowMin).toEqual(unweighted2);
  });

  it('always returns count distractors for count 1 and 2 across many seeded draws', () => {
    const rng = createSeededRng(45678);
    const confusion = [
      { id: 2, count: 5 },
      { id: 3, count: 3 },
    ];

    for (let i = 0; i < 100; i++) {
      const picks1 = pickDistractorsWeighted(pool, target, 1, confusion, rng);
      expect(picks1).toHaveLength(1);

      const picks2 = pickDistractorsWeighted(pool, target, 2, confusion, rng);
      expect(picks2).toHaveLength(2);
      expect(picks2[0].id).not.toBe(picks2[1].id);
    }
  });

  it('never returns the target or a same-name decoy', () => {
    const poolWithDecoy = [
      { id: 1, name: 'Spike Spiegel' },
      { id: 10, name: '  spike spiegel  ' },
      { id: 2, name: 'Faye Valentine' },
      { id: 3, name: 'Jet Black' },
      { id: 4, name: 'Edward Wong' },
    ];
    const confusionWithTarget = [
      { id: 1, count: 10 },
      { id: 10, count: 10 },
      { id: 2, count: 5 },
    ];
    const rng = createSeededRng(56789);

    for (let i = 0; i < 100; i++) {
      const picks = pickDistractorsWeighted(poolWithDecoy, target, 2, confusionWithTarget, rng);
      expect(picks).toHaveLength(2);
      const ids = picks.map((p) => p.id);
      expect(ids).not.toContain(1);
      expect(ids).not.toContain(10);
    }
  });

  it('throws the exact same errors as pickDistractors for negative count and too-few candidates', () => {
    let pickDistractorsNegativeErr = '';
    try {
      pickDistractors(pool, target, -1);
    } catch (e: any) {
      pickDistractorsNegativeErr = e.message;
    }
    expect(() => pickDistractorsWeighted(pool, target, -1)).toThrow(pickDistractorsNegativeErr);

    const smallPool = [
      { id: 1, name: 'Goku' },
      { id: 2, name: '  goku  ' },
      { id: 3, name: 'Vegeta' },
    ];
    const smallTarget = { id: 1, name: 'Goku' };
    let pickDistractorsTooFewErr = '';
    try {
      pickDistractors(smallPool, smallTarget, 2);
    } catch (e: any) {
      pickDistractorsTooFewErr = e.message;
    }
    expect(() => pickDistractorsWeighted(smallPool, smallTarget, 2)).toThrow(pickDistractorsTooFewErr);
  });

  it('biases towards eligible confusion partner noticeably more than uniform chance over 5000 draws', () => {
    const statRng = createSeededRng(88888);
    const partnerConfusion = [{ id: 2, count: 5 }];
    let partnerChosenCount = 0;
    const totalDraws = 5000;

    for (let i = 0; i < totalDraws; i++) {
      const picks = pickDistractorsWeighted(pool, target, 2, partnerConfusion, statRng, 0.6);
      if (picks.some((p) => p.id === 2)) {
        partnerChosenCount++;
      }
    }

    const rate = partnerChosenCount / totalDraws;
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThan(0.95);
  });
});

describe('nextIntervalHours', () => {
  it('always yields 4 on wrong answer regardless of SRS level or previous interval', () => {
    for (let level = 0; level <= 5; level++) {
      expect(nextIntervalHours(level, null, false)).toBe(WRONG_ANSWER_INTERVAL_HOURS);
      expect(nextIntervalHours(level, 720, false)).toBe(WRONG_ANSWER_INTERVAL_HOURS);
      expect(nextIntervalHours(level, 100, false, 'lightning')).toBe(WRONG_ANSWER_INTERVAL_HOURS);
    }
  });

  it('returns exact ladder values for levels 0 through 4 on correct answer', () => {
    expect(nextIntervalHours(0, null, true)).toBe(BASE_INTERVAL_HOURS[0]); // 0
    expect(nextIntervalHours(1, null, true)).toBe(BASE_INTERVAL_HOURS[1]); // 4
    expect(nextIntervalHours(2, null, true)).toBe(BASE_INTERVAL_HOURS[2]); // 24
    expect(nextIntervalHours(3, null, true)).toBe(BASE_INTERVAL_HOURS[3]); // 72
    expect(nextIntervalHours(4, null, true)).toBe(BASE_INTERVAL_HOURS[4]); // 168
  });

  it('doubles previous interval at level 5 with a minimum of 720', () => {
    expect(nextIntervalHours(5, null, true)).toBe(720);
    expect(nextIntervalHours(5, 0, true)).toBe(720);
    expect(nextIntervalHours(5, 500, true)).toBe(1000);
    expect(nextIntervalHours(5, 720, true)).toBe(1440);
  });

  it('respects MAX_INTERVAL_HOURS cap', () => {
    expect(nextIntervalHours(5, 1500, true)).toBe(MAX_INTERVAL_HOURS); // 3000 clamped to 2160
    expect(nextIntervalHours(5, 2000, true, 'lightning')).toBe(MAX_INTERVAL_HOURS);
  });

  it('applies lightning multiplier on correct answer', () => {
    expect(nextIntervalHours(2, null, true, 'lightning')).toBe(24 * LIGHTNING_INTERVAL_MULTIPLIER);
    expect(nextIntervalHours(5, 720, true, 'lightning')).toBe(1440 * LIGHTNING_INTERVAL_MULTIPLIER);
  });
});

describe('computeNextReviewAt / isDue / hoursOverdue', () => {
  const nowIso = '2026-09-21T12:00:00.000Z';

  it('computes next review timestamp correctly and handles round-trip', () => {
    const nextAt = computeNextReviewAt(nowIso, 24);
    expect(nextAt).toBe('2026-09-22T12:00:00.000Z');
    expect(isDue(nextAt, nowIso)).toBe(false);
    expect(hoursOverdue(nextAt, nowIso)).toBe(0);
  });

  it('handles 0 hours as immediately due', () => {
    const nextAt = computeNextReviewAt(nowIso, 0);
    expect(nextAt).toBe(nowIso);
    expect(isDue(nextAt, nowIso)).toBe(true);
    expect(hoursOverdue(nextAt, nowIso)).toBe(0);
  });

  it('treats negative and NaN intervals as 0', () => {
    expect(computeNextReviewAt(nowIso, -10)).toBe(nowIso);
    expect(computeNextReviewAt(nowIso, Number.NaN)).toBe(nowIso);
  });

  it('handles null and unparseable timestamps safely', () => {
    expect(isDue(null, nowIso)).toBe(false);
    expect(isDue('not-a-date', nowIso)).toBe(false);
    expect(hoursOverdue(null, nowIso)).toBe(0);
    expect(hoursOverdue('not-a-date', nowIso)).toBe(0);
  });

  it('computes fractional hours overdue correctly when due time has passed', () => {
    const pastTime = '2026-09-21T09:30:00.000Z'; // 2.5 hours earlier
    expect(isDue(pastTime, nowIso)).toBe(true);
    expect(hoursOverdue(pastTime, nowIso)).toBeCloseTo(2.5, 5);
  });
});

describe('medianMs', () => {
  it('returns null for an empty array or array with only non-finite values', () => {
    expect(medianMs([])).toBeNull();
    expect(medianMs([Number.NaN, Infinity, -Infinity])).toBeNull();
  });

  it('calculates true median for odd length array', () => {
    expect(medianMs([500, 100, 300])).toBe(300);
  });

  it('calculates average of middle two values for even length array', () => {
    expect(medianMs([100, 400, 200, 300])).toBe(250);
  });

  it('ignores non-finite values among valid numbers', () => {
    expect(medianMs([100, Number.NaN, 300, Infinity])).toBe(200);
  });
});

describe('deriveFluencyThresholds', () => {
  it('returns null when sampleCount is below MIN_LATENCY_SAMPLES', () => {
    expect(deriveFluencyThresholds(1000, MIN_LATENCY_SAMPLES - 1)).toBeNull();
    expect(deriveFluencyThresholds(1000, 0)).toBeNull();
  });

  it('returns null for null, zero, negative, or non-finite baseline', () => {
    expect(deriveFluencyThresholds(null, 20)).toBeNull();
    expect(deriveFluencyThresholds(0, 20)).toBeNull();
    expect(deriveFluencyThresholds(-500, 20)).toBeNull();
    expect(deriveFluencyThresholds(Number.NaN, 20)).toBeNull();
  });

  it('computes 0.6x and 1.6x thresholds when baseline is valid and mature', () => {
    const thresholds = deriveFluencyThresholds(1000, MIN_LATENCY_SAMPLES);
    expect(thresholds).toEqual({ lightning: 600, fluent: 1600 });
  });
});

describe('classifyFluency', () => {
  const thresholds = { lightning: 600, fluent: 1600 };

  it('returns null for null thresholds or invalid elapsedMs', () => {
    expect(classifyFluency(500, null)).toBeNull();
    expect(classifyFluency(null, thresholds)).toBeNull();
    expect(classifyFluency(-1, thresholds)).toBeNull();
    expect(classifyFluency(Number.NaN, thresholds)).toBeNull();
  });

  it('classifies elapsedMs > MAX_SCORABLE_ELAPSED_MS as hesitant', () => {
    expect(classifyFluency(MAX_SCORABLE_ELAPSED_MS + 1, thresholds)).toBe('hesitant');
    expect(classifyFluency(120000, thresholds)).toBe('hesitant');
  });

  it('classifies each latency band including exact boundaries', () => {
    expect(classifyFluency(500, thresholds)).toBe('lightning');
    expect(classifyFluency(600, thresholds)).toBe('lightning'); // exact boundary
    expect(classifyFluency(601, thresholds)).toBe('fluent');
    expect(classifyFluency(1600, thresholds)).toBe('fluent'); // exact boundary
    expect(classifyFluency(1601, thresholds)).toBe('hesitant');
    expect(classifyFluency(MAX_SCORABLE_ELAPSED_MS, thresholds)).toBe('hesitant');
  });
});

describe('applyFluencyToPromotion', () => {
  it('breaks deadlocks: reaches level 5 on consecutive hesitant answers without exceeding MAX_HESITANT_BLOCKS consecutive blocks', () => {
    let level = 0;
    let streak = 0;
    let consecutiveBlocks = 0;

    for (let i = 0; i < 20; i++) {
      const decision = applyFluencyToPromotion(level, true, 'hesitant', streak);
      if (decision.blocked) {
        consecutiveBlocks++;
        expect(consecutiveBlocks).toBeLessThanOrEqual(MAX_HESITANT_BLOCKS);
      } else {
        consecutiveBlocks = 0;
      }
      level = decision.srsLevelAfter;
      streak = decision.hesitantStreak;
    }

    expect(level).toBe(5);
  });

  it('resets hesitant streak on non-hesitant answer and promotes normally', () => {
    const fluentDecision = applyFluencyToPromotion(2, true, 'fluent', 1);
    expect(fluentDecision.srsLevelAfter).toBe(3);
    expect(fluentDecision.hesitantStreak).toBe(0);
    expect(fluentDecision.blocked).toBe(false);

    const lightningDecision = applyFluencyToPromotion(2, true, 'lightning', 1);
    expect(lightningDecision.srsLevelAfter).toBe(3);
    expect(lightningDecision.hesitantStreak).toBe(0);
    expect(lightningDecision.blocked).toBe(false);

    const nullFluencyDecision = applyFluencyToPromotion(2, true, null, 1);
    expect(nullFluencyDecision.srsLevelAfter).toBe(3);
    expect(nullFluencyDecision.hesitantStreak).toBe(0);
    expect(nullFluencyDecision.blocked).toBe(false);
  });

  it('resets hesitant streak and demotes on wrong answer', () => {
    const wrongDecision = applyFluencyToPromotion(3, false, 'hesitant', 1);
    expect(wrongDecision.srsLevelAfter).toBe(2); // 3 - 1 = 2
    expect(wrongDecision.hesitantStreak).toBe(0);
    expect(wrongDecision.blocked).toBe(false);
  });
});

describe('leechTransition', () => {
  it('flags as leech at 4 wrong answers with accuracy below 0.5', () => {
    // 3 correct, 4 wrong -> total 7, accuracy ~42.8% < 50%
    const state = leechTransition(
      { correctCount: 3, wrongCount: 4, isLeech: false, leechStreak: 0 },
      false
    );
    expect(state.isLeech).toBe(true);
    expect(state.leechStreak).toBe(0);
  });

  it('does not flag as leech at 3 wrong answers even with low accuracy', () => {
    const state = leechTransition(
      { correctCount: 0, wrongCount: 3, isLeech: false, leechStreak: 0 },
      false
    );
    expect(state.isLeech).toBe(false);
    expect(state.leechStreak).toBe(0);
  });

  it('graduates on exactly the 3rd consecutive correct main answer', () => {
    let state = { isLeech: true, leechStreak: 0 };

    state = leechTransition({ correctCount: 1, wrongCount: 4, ...state }, true);
    expect(state.isLeech).toBe(true);
    expect(state.leechStreak).toBe(1);

    state = leechTransition({ correctCount: 2, wrongCount: 4, ...state }, true);
    expect(state.isLeech).toBe(true);
    expect(state.leechStreak).toBe(2);

    state = leechTransition({ correctCount: 3, wrongCount: 4, ...state }, true);
    expect(state.isLeech).toBe(false); // Graduated!
    expect(state.leechStreak).toBe(0);
  });

  it('resets streak to 0 on wrong answer and never clears leech flag', () => {
    const state = leechTransition(
      { correctCount: 5, wrongCount: 5, isLeech: true, leechStreak: 2 },
      false
    );
    expect(state.isLeech).toBe(true);
    expect(state.leechStreak).toBe(0);
  });

  it('is a total no-op when isCorrectMainAnswer is null (remediation answer)', () => {
    const state = leechTransition(
      { correctCount: 2, wrongCount: 4, isLeech: true, leechStreak: 2 },
      null
    );
    expect(state).toEqual({ isLeech: true, leechStreak: 2 });
  });
});

describe('heatCellState', () => {
  const nowIso = '2026-09-21T12:00:00.000Z';

  it('prioritizes unseen above everything else when total answers is 0', () => {
    expect(
      heatCellState(
        { srsLevel: 0, correctCount: 0, wrongCount: 0, isLeech: true, nextReviewAt: '2020-01-01T00:00:00.000Z' },
        nowIso
      )
    ).toBe('unseen');
  });

  it('returns critical when isLeech is true', () => {
    expect(
      heatCellState(
        { srsLevel: 3, correctCount: 1, wrongCount: 5, isLeech: true, nextReviewAt: '2099-01-01T00:00:00.000Z' },
        nowIso
      )
    ).toBe('critical');
  });

  it('returns critical when review is overdue', () => {
    expect(
      heatCellState(
        { srsLevel: 3, correctCount: 5, wrongCount: 1, isLeech: false, nextReviewAt: '2026-09-20T00:00:00.000Z' },
        nowIso
      )
    ).toBe('critical');
  });

  it('does not mark critical when nextReviewAt is null', () => {
    expect(
      heatCellState(
        { srsLevel: 3, correctCount: 5, wrongCount: 1, isLeech: false, nextReviewAt: null },
        nowIso
      )
    ).toBe('learning');
  });

  it('maps SRS levels to mastered (5), solid (4), and learning (0..3)', () => {
    const futureIso = '2099-01-01T00:00:00.000Z';
    expect(
      heatCellState(
        { srsLevel: 5, correctCount: 10, wrongCount: 0, isLeech: false, nextReviewAt: futureIso },
        nowIso
      )
    ).toBe('mastered');

    expect(
      heatCellState(
        { srsLevel: 4, correctCount: 8, wrongCount: 1, isLeech: false, nextReviewAt: futureIso },
        nowIso
      )
    ).toBe('solid');

    expect(
      heatCellState(
        { srsLevel: 2, correctCount: 4, wrongCount: 1, isLeech: false, nextReviewAt: futureIso },
        nowIso
      )
    ).toBe('learning');
  });
});

describe('parameterised remediation target', () => {
  it('respects custom mastery target in remediationTransition', () => {
    // With target = 3
    expect(remediationTransition(2, true, 3)).toBe(3);
    expect(remediationTransition(3, true, 3)).toBe(3);
    expect(remediationTransition(3, false, 3)).toBe(2);

    // Default target = 2
    expect(remediationTransition(1, true)).toBe(DEFAULT_REMEDIATION_MASTERY);
    expect(remediationTransition(2, true)).toBe(2);
    expect(remediationTransition(2, false)).toBe(1);
  });

  it('respects custom mastery target in createRemediationTracker', () => {
    const tracker = createRemediationTracker([42], 3);
    expect(tracker.getMasteryTarget()).toBe(3);
    expect(tracker.isComplete()).toBe(false);

    tracker.applyAnswer(42, true); // 1
    expect(tracker.getMastery(42)).toBe(1);
    expect(tracker.isComplete()).toBe(false);

    tracker.applyAnswer(42, true); // 2 -> not complete yet with target 3
    expect(tracker.getMastery(42)).toBe(2);
    expect(tracker.isComplete()).toBe(false);

    tracker.applyAnswer(42, true); // 3 -> now mastered!
    expect(tracker.getMastery(42)).toBe(3);
    expect(tracker.isComplete()).toBe(true);
    expect(tracker.nextTarget).toBeNull();
  });

  it('preserves default mastery target of 2 when omitted', () => {
    const defaultTracker = createRemediationTracker([42]);
    expect(defaultTracker.getMasteryTarget()).toBe(2);

    defaultTracker.applyAnswer(42, true); // 1
    expect(defaultTracker.isComplete()).toBe(false);

    defaultTracker.applyAnswer(42, true); // 2 -> mastered with default target 2!
    expect(defaultTracker.isComplete()).toBe(true);
  });
});

describe('learning engine constants', () => {
  it('exports expected default values for constants', () => {
    expect(LEECH_MIN_WRONG).toBe(4);
    expect(LEECH_MAX_ACCURACY).toBe(0.5);
    expect(LEECH_GRADUATION_STREAK).toBe(3);
    expect(CONFUSION_BIAS).toEqual({ classic: 0.6, match: 0.4 });
    expect(MIN_CONFUSION_COUNT).toBe(2);
  });
});

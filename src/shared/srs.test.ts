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
    expect(srsTransition(3, false)).toBe(1);
    expect(srsTransition(0, true)).toBe(1);
    expect(srsTransition(5, false)).toBe(3);
  });

  it('matches a hand-computed alternating correct/wrong sequence', () => {
    // Sequence starting at level 2:
    // 1. correct:  2 -> 3
    // 2. wrong:    3 -> 1
    // 3. correct:  1 -> 2
    // 4. correct:  2 -> 3
    // 5. wrong:    3 -> 1
    // 6. wrong:    1 -> 0 (floored)
    // 7. wrong:    0 -> 0 (floored)
    // 8. correct:  0 -> 1
    // 9. correct:  1 -> 2
    // 10. correct: 2 -> 3
    // 11. correct: 3 -> 4
    // 12. correct: 4 -> 5
    // 13. correct: 5 -> 5 (capped)
    // 14. wrong:   5 -> 3
    const answers = [
      true,  // 3
      false, // 1
      true,  // 2
      true,  // 3
      false, // 1
      false, // 0
      false, // 0
      true,  // 1
      true,  // 2
      true,  // 3
      true,  // 4
      true,  // 5
      true,  // 5
      false, // 3
    ];

    let level = 2;
    for (const ans of answers) {
      level = srsTransition(level, ans);
    }

    expect(level).toBe(3);
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

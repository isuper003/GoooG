import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createRoundPicker,
  pickDistractorsWeighted,
  CONFUSION_BIAS,
  createRemediationTracker,
  deriveFluencyThresholds,
  classifyFluency,
  applyFluencyToPromotion,
  medianMs,
  MIN_LATENCY_SAMPLES,
  type RemediationTracker,
  type Fluency,
  type ConfusionEntry,
} from '../../shared/srs';
import type { GameSessionPoolCharacter } from '../../shared/types';
import type { GameAnswerInput } from '../../shared/validation';
import { apiClient } from '../lib/apiClient';
import { queryClient } from '../lib/queryClient';
import { toProxiedImageUrl } from '../lib/imageUrl';

export type GameMode = 'classic' | 'match';

export type GameStatus =
  | 'playing'
  | 'feedback'
  | 'results'
  | 'remediationPlaying'
  | 'remediationFeedback'
  | 'complete';

export interface UseGameSessionInput {
  sessionId: number;
  pool: GameSessionPoolCharacter[];
  mode: GameMode;
  plannedRounds: number | null;
  focusIds?: number[] | null;
  confusion?: Record<number, ConfusionEntry[]> | null;
  latencyBaseline?: {
    classic: number | null;
    match: number | null;
    classicSamples: number;
    matchSamples: number;
  } | null;
}

interface ClassicRoundData {
  mode: 'classic';
  imageUrl: string;
  options: { characterId: number; name: string }[];
  correctCharacterId: number;
}

interface MatchRoundData {
  mode: 'match';
  promptName: string;
  correctCharacterId: number;
  tiles: { characterId: number; imageUrl: string }[];
}

export type RoundData = ClassicRoundData | MatchRoundData;

export interface MissedCharacter {
  id: number;
  name: string;
  imageUrl: string;
}

export interface RemediationProgress {
  masteredCount: number;
  totalCount: number;
}

export interface FinalSummary {
  totalRoundsPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  remediationRoundsPlayed: number;
  accuracy: number;
  fluencyBreakdown: {
    lightning: number;
    fluent: number;
    hesitant: number;
    unscored: number;
  };
  medianElapsedMs: number | null;
  promotionsBlocked: number;
}

interface LiveCharacter {
  id: number;
  name: string;
  images: string[];
  srsLevel: number;
  [key: string]: unknown;
}

interface AnswerRecord {
  characterId: number;
  phase: 'main' | 'remediation';
  isCorrect: boolean;
  roundIndex: number;
  elapsedMs: number | null;
  fluency: Fluency | null;
  blocked: boolean;
}

const FEEDBACK_MS = 700;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomImage(images: string[]): string {
  if (images.length === 0) return '';
  return images[Math.floor(Math.random() * images.length)];
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = toProxiedImageUrl(url);
    if (typeof img.decode === 'function') {
      img.decode().then(
        () => resolve(),
        () => resolve()
      );
    }
  });
}

function preloadRound(round: RoundData): Promise<void> {
  const urls = round.mode === 'classic' ? [round.imageUrl] : round.tiles.map((t) => t.imageUrl);
  return Promise.all(urls.map(preloadImage)).then(() => undefined);
}

function buildRoundData(
  targetId: number,
  mode: GameMode,
  liveChars: Map<number, LiveCharacter>,
  confusion?: Record<number, ConfusionEntry[]> | null
): RoundData {
  const target = liveChars.get(targetId);
  if (!target) {
    throw new Error(`buildRoundData: character ${targetId} not found in pool`);
  }
  const allChars = Array.from(liveChars.values());
  const confusionFor = (id: number): ConfusionEntry[] => confusion?.[id] ?? [];

  if (mode === 'classic') {
    const distractors = pickDistractorsWeighted(
      allChars,
      target,
      2,
      confusionFor(target.id),
      Math.random,
      CONFUSION_BIAS.classic
    );
    const options = shuffle([
      { characterId: target.id, name: target.name },
      ...distractors.map((d) => ({ characterId: d.id, name: d.name })),
    ]);
    return {
      mode: 'classic',
      imageUrl: pickRandomImage(target.images),
      options,
      correctCharacterId: target.id,
    };
  }

  const [distractor] = pickDistractorsWeighted(
    allChars,
    target,
    1,
    confusionFor(target.id),
    Math.random,
    CONFUSION_BIAS.match
  );
  if (!distractor) {
    throw new Error(`buildRoundData: failed to pick match distractor for character ${targetId}`);
  }
  const tiles = shuffle([
    { characterId: target.id, imageUrl: pickRandomImage(target.images) },
    { characterId: distractor.id, imageUrl: pickRandomImage(distractor.images) },
  ]);
  return {
    mode: 'match',
    promptName: target.name,
    correctCharacterId: target.id,
    tiles,
  };
}

export function useGameSession(input: UseGameSessionInput) {
  const liveCharsRef = useRef<Map<number, LiveCharacter>>(
    new Map(
      input.pool.map((c) => [
        c.id,
        { id: c.id, name: c.name, images: c.images, srsLevel: c.srsLevel },
      ])
    )
  );
  const pickerRef = useRef(
    (() => {
      const activePool =
        input.focusIds && input.focusIds.length > 0
          ? input.pool.filter((c) => input.focusIds?.includes(c.id))
          : input.pool;
      const poolMembers = activePool.map((c) => ({ id: c.id, srsLevel: c.srsLevel }));
      return createRoundPicker(poolMembers);
    })()
  );
  const remediationTrackerRef = useRef<RemediationTracker | null>(null);
  const answersRef = useRef<AnswerRecord[]>([]);
  const missedIdsRef = useRef<Set<number>>(new Set());
  const mainRoundIndexRef = useRef(0);
  const remediationRoundIndexRef = useRef(0);
  const outboxTailRef = useRef<Promise<void>>(Promise.resolve());
  const finalizedRef = useRef(false);
  const initializedRef = useRef(false);

  const roundStartRef = useRef<number | null>(null);
  const roundDiscardedRef = useRef(false);
  const sessionSamplesRef = useRef<number[]>([]);
  const hesitantStreakRef = useRef<Map<number, number>>(new Map());

  const [status, setStatus] = useState<GameStatus>('playing');
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [missedCharacters, setMissedCharacters] = useState<MissedCharacter[]>([]);
  const [remediationProgress, setRemediationProgress] = useState<RemediationProgress | null>(
    null
  );
  const [finalSummary, setFinalSummary] = useState<FinalSummary | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const firstTargetId = pickerRef.current.next().id;
    const firstRound = buildRoundData(
      firstTargetId,
      input.mode,
      liveCharsRef.current,
      input.confusion
    );
    setCurrentRound(firstRound);
    setStatus('playing');
    void preloadRound(firstRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentRound) return;
    if (status !== 'playing' && status !== 'remediationPlaying') return;
    roundStartRef.current = null;
    roundDiscardedRef.current = false;
    let cancelled = false;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!cancelled) roundStartRef.current = performance.now();
      })
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [currentRound, status]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        roundDiscardedRef.current = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  function enqueueAnswerPost(payload: GameAnswerInput) {
    outboxTailRef.current = outboxTailRef.current.then(() => postWithRetry(payload));
  }

  async function postWithRetry(payload: GameAnswerInput, attempt = 0): Promise<void> {
    try {
      await apiClient.postAnswer(input.sessionId, payload);
    } catch (err) {
      if (attempt < 2) {
        await wait(attempt === 0 ? 300 : 900);
        return postWithRetry(payload, attempt + 1);
      }
      console.warn('[useGameSession] answer failed to record after retries', payload, err);
    }
  }

  function finalizeSession() {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const mainAnswers = answersRef.current.filter((a) => a.phase === 'main');
    const remediationAnswers = answersRef.current.filter((a) => a.phase === 'remediation');
    const totalCorrect = mainAnswers.filter((a) => a.isCorrect).length;
    const totalWrong = mainAnswers.filter((a) => !a.isCorrect).length;

    const fluencyBreakdown = {
      lightning: 0,
      fluent: 0,
      hesitant: 0,
      unscored: 0,
    };
    for (const a of mainAnswers) {
      if (a.fluency === 'lightning') {
        fluencyBreakdown.lightning += 1;
      } else if (a.fluency === 'fluent') {
        fluencyBreakdown.fluent += 1;
      } else if (a.fluency === 'hesitant') {
        fluencyBreakdown.hesitant += 1;
      } else {
        fluencyBreakdown.unscored += 1;
      }
    }

    const mainElapsedSamples = mainAnswers
      .map((a) => a.elapsedMs)
      .filter((ms): ms is number => ms !== null);
    const medianElapsedMs = medianMs(mainElapsedSamples);
    const promotionsBlocked = mainAnswers.filter((a) => a.blocked).length;

    const summary: FinalSummary = {
      totalRoundsPlayed: mainAnswers.length,
      totalCorrect,
      totalWrong,
      remediationRoundsPlayed: remediationAnswers.length,
      accuracy: mainAnswers.length > 0 ? totalCorrect / mainAnswers.length : 0,
      fluencyBreakdown,
      medianElapsedMs,
      promotionsBlocked,
    };

    setFinalSummary(summary);
    setStatus('complete');

    apiClient
      .finishSession(input.sessionId, {
        totalRoundsPlayed: summary.totalRoundsPlayed,
        totalCorrect: summary.totalCorrect,
        totalWrong: summary.totalWrong,
        remediationRoundsPlayed: summary.remediationRoundsPlayed,
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['review'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      })
      .catch((err) => console.warn('[useGameSession] finish session failed', err));
  }

  function goToResults() {
    const missedIds = Array.from(missedIdsRef.current);
    if (missedIds.length === 0) {
      finalizeSession();
      return;
    }
    const snapshot: MissedCharacter[] = missedIds.flatMap((id) => {
      const c = liveCharsRef.current.get(id);
      return c ? [{ id: c.id, name: c.name, imageUrl: c.images[0] ?? '' }] : [];
    });
    setMissedCharacters(snapshot);
    setStatus('results');
  }

  async function advanceMain() {
    const reachedPlanned =
      input.plannedRounds !== null && mainRoundIndexRef.current >= input.plannedRounds;
    if (reachedPlanned) {
      await wait(FEEDBACK_MS);
      goToResults();
      return;
    }
    const nextId = pickerRef.current.next().id;
    const next = buildRoundData(nextId, input.mode, liveCharsRef.current, input.confusion);
    await Promise.all([wait(FEEDBACK_MS), preloadRound(next)]);
    setCurrentRound(next);
    setSelectedCharacterId(null);
    setRoundNumber(mainRoundIndexRef.current + 1);
    setStatus('playing');
  }

  async function advanceRemediation() {
    const tracker = remediationTrackerRef.current;
    if (!tracker || tracker.isComplete()) {
      await wait(FEEDBACK_MS);
      finalizeSession();
      return;
    }
    const nextId = tracker.getNextTarget();
    if (nextId === null) {
      await wait(FEEDBACK_MS);
      finalizeSession();
      return;
    }
    const next = buildRoundData(nextId, input.mode, liveCharsRef.current, input.confusion);
    await Promise.all([wait(FEEDBACK_MS), preloadRound(next)]);
    setCurrentRound(next);
    setSelectedCharacterId(null);
    setStatus('remediationPlaying');
  }

  function submitAnswer(selectedId: number) {
    if (!currentRound) return;
    if (status !== 'playing' && status !== 'remediationPlaying') return;

    const isCorrect = selectedId === currentRound.correctCharacterId;
    const targetId = currentRound.correctCharacterId;
    const phase: 'main' | 'remediation' = status === 'playing' ? 'main' : 'remediation';
    const roundIndex =
      phase === 'main' ? mainRoundIndexRef.current : remediationRoundIndexRef.current;

    const liveChar = liveCharsRef.current.get(targetId);
    if (!liveChar) {
      return;
    }
    const srsLevelBefore = liveChar.srsLevel;

    const elapsedMs =
      roundStartRef.current === null || roundDiscardedRef.current
        ? null
        : Math.round(performance.now() - roundStartRef.current);

    if (phase === 'main' && elapsedMs !== null) {
      sessionSamplesRef.current.push(elapsedMs);
    }

    const serverBaseline =
      input.mode === 'classic'
        ? input.latencyBaseline?.classic ?? null
        : input.latencyBaseline?.match ?? null;
    const serverSamples =
      input.mode === 'classic'
        ? input.latencyBaseline?.classicSamples ?? 0
        : input.latencyBaseline?.matchSamples ?? 0;

    const sessionSamples = sessionSamplesRef.current;
    const sessionMedian =
      sessionSamples.length >= MIN_LATENCY_SAMPLES ? medianMs(sessionSamples) : null;
    const baselineForMode = sessionMedian ?? serverBaseline;
    const sampleCountForMode = Math.max(serverSamples, sessionSamples.length);

    const thresholds = deriveFluencyThresholds(baselineForMode, sampleCountForMode);
    const fluency = classifyFluency(elapsedMs, thresholds);
    const streakForCharacter = hesitantStreakRef.current.get(targetId) ?? 0;
    const decision = applyFluencyToPromotion(srsLevelBefore, isCorrect, fluency, streakForCharacter);
    hesitantStreakRef.current.set(targetId, decision.hesitantStreak);
    liveChar.srsLevel = decision.srsLevelAfter;

    answersRef.current.push({
      characterId: targetId,
      phase,
      isCorrect,
      roundIndex,
      elapsedMs,
      fluency,
      blocked: decision.blocked,
    });

    if (phase === 'main') {
      mainRoundIndexRef.current += 1;
      if (!isCorrect) missedIdsRef.current.add(targetId);
    } else {
      remediationRoundIndexRef.current += 1;
      const tracker = remediationTrackerRef.current;
      if (tracker) {
        tracker.applyAnswer(targetId, isCorrect);
        setRemediationProgress({
          masteredCount: tracker.getMasteredCount(),
          totalCount: tracker.getTotalCount(),
        });
      }
    }

    const payload: GameAnswerInput = {
      phase,
      roundIndex,
      characterId: targetId,
      isCorrect,
      srsLevelBefore,
      srsLevelAfter: decision.srsLevelAfter,
      selectedCharacterId: isCorrect ? null : selectedId,
      elapsedMs,
      fluency,
      mode: input.mode,
    };

    enqueueAnswerPost(payload);

    setSelectedCharacterId(selectedId);
    setLastAnswerCorrect(isCorrect);
    setStatus(phase === 'main' ? 'feedback' : 'remediationFeedback');

    if (phase === 'main') {
      void advanceMain();
    } else {
      void advanceRemediation();
    }
  }

  function endSessionEarly() {
    if (status !== 'playing') return;
    goToResults();
  }

  function startRemediation() {
    if (status !== 'results') return;
    const missedIds = Array.from(missedIdsRef.current);
    const tracker = createRemediationTracker(missedIds);
    remediationTrackerRef.current = tracker;
    remediationRoundIndexRef.current = 0;
    setRemediationProgress({ masteredCount: 0, totalCount: tracker.getTotalCount() });

    const nextId = tracker.getNextTarget();
    if (nextId === null) {
      finalizeSession();
      return;
    }
    const round = buildRoundData(nextId, input.mode, liveCharsRef.current, input.confusion);
    setCurrentRound(round);
    setSelectedCharacterId(null);
    setStatus('remediationPlaying');
    void preloadRound(round);
  }

  function skipRemediation() {
    if (status !== 'results') return;
    finalizeSession();
  }

  function finishRemediationEarly() {
    if (status !== 'remediationPlaying') return;
    finalizeSession();
  }

  return useMemo(
    () => ({
      status,
      mode: input.mode,
      currentRound,
      lastAnswerCorrect,
      selectedCharacterId,
      roundNumber,
      plannedRounds: input.plannedRounds,
      missedCharacters,
      remediationProgress,
      finalSummary,
      submitAnswer,
      endSessionEarly,
      startRemediation,
      skipRemediation,
      finishRemediationEarly,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      status,
      currentRound,
      lastAnswerCorrect,
      selectedCharacterId,
      roundNumber,
      missedCharacters,
      remediationProgress,
      finalSummary,
    ]
  );
}

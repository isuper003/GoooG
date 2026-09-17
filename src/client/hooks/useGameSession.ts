import { useEffect, useMemo, useRef, useState } from 'react';
import {
  srsTransition,
  createRoundPicker,
  pickDistractors,
  createRemediationTracker,
  type RemediationTracker,
} from '../../shared/srs';
import type { GameSessionPoolCharacter } from '../../shared/types';
import { apiClient } from '../lib/apiClient';

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
    img.src = url;
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
  liveChars: Map<number, LiveCharacter>
): RoundData {
  const target = liveChars.get(targetId);
  if (!target) {
    throw new Error(`buildRoundData: character ${targetId} not found in pool`);
  }
  const allChars = Array.from(liveChars.values());

  if (mode === 'classic') {
    const distractors = pickDistractors(allChars, target, 2);
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

  const [distractor] = pickDistractors(allChars, target, 1);
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
      const poolMembers = input.pool.map((c) => ({ id: c.id, srsLevel: c.srsLevel }));
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
    const firstRound = buildRoundData(firstTargetId, input.mode, liveCharsRef.current);
    setCurrentRound(firstRound);
    setStatus('playing');
    void preloadRound(firstRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enqueueAnswerPost(payload: {
    phase: 'main' | 'remediation';
    roundIndex: number;
    characterId: number;
    isCorrect: boolean;
    srsLevelBefore: number;
    srsLevelAfter: number;
  }) {
    outboxTailRef.current = outboxTailRef.current.then(() => postWithRetry(payload));
  }

  async function postWithRetry(
    payload: {
      phase: 'main' | 'remediation';
      roundIndex: number;
      characterId: number;
      isCorrect: boolean;
      srsLevelBefore: number;
      srsLevelAfter: number;
    },
    attempt = 0
  ): Promise<void> {
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

    const summary: FinalSummary = {
      totalRoundsPlayed: mainAnswers.length,
      totalCorrect,
      totalWrong,
      remediationRoundsPlayed: remediationAnswers.length,
      accuracy: mainAnswers.length > 0 ? totalCorrect / mainAnswers.length : 0,
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
      .catch((err) => console.warn('[useGameSession] finish session failed', err));
  }

  function goToResults() {
    const missedIds = Array.from(missedIdsRef.current);
    if (missedIds.length === 0) {
      finalizeSession();
      return;
    }
    const snapshot: MissedCharacter[] = missedIds.map((id) => {
      const c = liveCharsRef.current.get(id)!;
      return { id: c.id, name: c.name, imageUrl: c.images[0] ?? '' };
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
    const next = buildRoundData(nextId, input.mode, liveCharsRef.current);
    await Promise.all([wait(FEEDBACK_MS), preloadRound(next)]);
    setCurrentRound(next);
    setSelectedCharacterId(null);
    setRoundNumber(mainRoundIndexRef.current + 1);
    setStatus('playing');
  }

  async function advanceRemediation() {
    const tracker = remediationTrackerRef.current!;
    if (tracker.isComplete()) {
      await wait(FEEDBACK_MS);
      finalizeSession();
      return;
    }
    const nextId = tracker.getNextTarget()!;
    const next = buildRoundData(nextId, input.mode, liveCharsRef.current);
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

    const liveChar = liveCharsRef.current.get(targetId)!;
    const srsLevelBefore = liveChar.srsLevel;
    const srsLevelAfter = srsTransition(srsLevelBefore, isCorrect);
    liveChar.srsLevel = srsLevelAfter;

    answersRef.current.push({ characterId: targetId, phase, isCorrect, roundIndex });

    if (phase === 'main') {
      mainRoundIndexRef.current += 1;
      if (!isCorrect) missedIdsRef.current.add(targetId);
    } else {
      remediationRoundIndexRef.current += 1;
      remediationTrackerRef.current!.applyAnswer(targetId, isCorrect);
      const tracker = remediationTrackerRef.current!;
      setRemediationProgress({
        masteredCount: tracker.getMasteredCount(),
        totalCount: tracker.getTotalCount(),
      });
    }

    enqueueAnswerPost({ phase, roundIndex, characterId: targetId, isCorrect, srsLevelBefore, srsLevelAfter });

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

    const nextId = tracker.getNextTarget()!;
    const round = buildRoundData(nextId, input.mode, liveCharsRef.current);
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

import { Hono } from 'hono';
import { queryAll, queryOne } from '../db';
import type {
  StatsOverview,
  CategoryStats,
  ConfusedPair,
  HeatmapCell,
  HeatmapResponse,
} from '../../shared/types';
import { heatCellState, type HeatCellState } from '../../shared/srs';
import type { AppEnv } from '../app';

interface ConfusedPairRow {
  target_id: number;
  target_name: string;
  selected_id: number;
  selected_name: string;
  n: number;
}

interface SessionsStatsRow {
  games_played: number;
}

interface AnswersStatsRow {
  total_rounds: number;
  total_correct: number;
}

interface CategoryTotalsRow {
  key: string;
  correct: number;
  wrong: number;
}

interface CharacterKpisRow {
  active_characters: number;
  mastered_characters: number;
  struggling_characters: number;
}

export const statsRouter = new Hono<AppEnv>();

// GET /api/stats/overview
statsRouter.get('/overview', async (c) => {
  const [sessionsStats, answersStats, categoryTotals, characterKpis] = await Promise.all([
    queryOne<SessionsStatsRow>(
      c.env.DB,
      `SELECT
         COUNT(*) AS games_played
       FROM game_sessions
       WHERE status = 'completed'`
    ),
    queryOne<AnswersStatsRow>(
      c.env.DB,
      `SELECT
         COUNT(*) AS total_rounds,
         COALESCE(SUM(is_correct), 0) AS total_correct
       FROM game_answers
       WHERE phase = 'main'`
    ),
    queryAll<CategoryTotalsRow>(
      c.env.DB,
      `SELECT
         cat.key,
         COUNT(CASE WHEN ga.is_correct = 1 THEN 1 END) AS correct,
         COUNT(CASE WHEN ga.is_correct = 0 THEN 1 END) AS wrong
       FROM categories cat
       LEFT JOIN characters c ON cat.id = c.category_id
       LEFT JOIN game_answers ga ON c.id = ga.character_id AND ga.phase = 'main'
       GROUP BY cat.id, cat.key, cat.sort_order
       ORDER BY cat.sort_order ASC`
    ),
    queryOne<CharacterKpisRow>(
      c.env.DB,
      `SELECT
         COUNT(*) AS active_characters,
         COALESCE(SUM(CASE WHEN srs_level >= 4 THEN 1 ELSE 0 END), 0) AS mastered_characters,
         COALESCE(SUM(CASE WHEN (correct_count + wrong_count) > 0 AND (CAST(correct_count AS REAL) / (correct_count + wrong_count)) < 0.5 THEN 1 ELSE 0 END), 0) AS struggling_characters
       FROM characters
       WHERE is_active = 1`
    ),
  ]);

  const totalRoundsAnswered = Number(answersStats?.total_rounds || 0);
  const totalCorrect = Number(answersStats?.total_correct || 0);
  const totalWrong = totalRoundsAnswered - totalCorrect;
  const overallAccuracy =
    totalRoundsAnswered > 0 ? Number((totalCorrect / totalRoundsAnswered).toFixed(4)) : 0;

  const byCategory: CategoryStats[] = categoryTotals.map((cat) => {
    const correct = Number(cat.correct || 0);
    const wrong = Number(cat.wrong || 0);
    const catTotal = correct + wrong;
    const accuracy = catTotal > 0 ? Number((correct / catTotal).toFixed(4)) : 0;
    return {
      category: cat.key,
      correct,
      wrong,
      accuracy,
    };
  });

  const response: StatsOverview = {
    gamesPlayed: Number(sessionsStats?.games_played || 0),
    totalRoundsAnswered,
    overallAccuracy,
    byCategory,
    totalCorrect,
    totalWrong,
    activeCharacters: Number(characterKpis?.active_characters || 0),
    masteredCharacters: Number(characterKpis?.mastered_characters || 0),
    strugglingCharacters: Number(characterKpis?.struggling_characters || 0),
  };

  return c.json(response);
});

// GET /api/stats/confusions
statsRouter.get('/confusions', async (c) => {
  const rawLimit = c.req.query('limit');
  let limit = 20;
  if (rawLimit !== undefined) {
    const parsed = parseInt(rawLimit, 10);
    if (!Number.isNaN(parsed)) {
      limit = Math.min(50, Math.max(1, parsed));
    }
  }

  const rows = await queryAll<ConfusedPairRow>(
    c.env.DB,
    `SELECT a.character_id AS target_id, t.name AS target_name,
            a.selected_character_id AS selected_id, sc.name AS selected_name,
            COUNT(*) AS n
     FROM game_answers a
     JOIN game_sessions s ON s.id = a.session_id
     JOIN characters t  ON t.id  = a.character_id
     JOIN characters sc ON sc.id = a.selected_character_id
     WHERE a.is_correct = 0
       AND a.selected_character_id IS NOT NULL
       AND s.mode = 'classic'
     GROUP BY a.character_id, a.selected_character_id
     HAVING COUNT(*) >= 2
     ORDER BY n DESC
     LIMIT ?`,
    limit
  );

  const response: ConfusedPair[] = rows.map((r) => ({
    targetId: Number(r.target_id),
    targetName: r.target_name,
    selectedId: Number(r.selected_id),
    selectedName: r.selected_name,
    count: Number(r.n),
  }));

  return c.json(response);
});

interface HeatmapQueryRow {
  id: number;
  name: string;
  category_key: string;
  srs_level: number;
  correct_count: number;
  wrong_count: number;
  is_leech: number;
  next_review_at: string | null;
}

// GET /api/stats/heatmap
statsRouter.get('/heatmap', async (c) => {
  const rows = await queryAll<HeatmapQueryRow>(
    c.env.DB,
    `SELECT c.id, c.name, cat.key AS category_key, c.srs_level,
            c.correct_count, c.wrong_count, c.is_leech, c.next_review_at
     FROM characters c
     JOIN categories cat ON c.category_id = cat.id
     WHERE c.is_active = 1
     ORDER BY cat.sort_order ASC, c.name ASC`
  );

  const nowIso = new Date().toISOString();

  const byState: Record<HeatCellState, number> = {
    mastered: 0,
    solid: 0,
    learning: 0,
    critical: 0,
    unseen: 0,
  };

  const cells: HeatmapCell[] = [];

  interface CriticalCandidate {
    id: number;
    isLeech: boolean;
    nextReviewAt: string | null;
  }
  const criticalCandidates: CriticalCandidate[] = [];

  for (const r of rows) {
    const isLeech = Boolean(r.is_leech);
    const state = heatCellState(
      {
        srsLevel: r.srs_level,
        correctCount: r.correct_count,
        wrongCount: r.wrong_count,
        isLeech,
        nextReviewAt: r.next_review_at,
      },
      nowIso
    );

    cells.push({
      id: Number(r.id),
      name: r.name,
      categoryKey: r.category_key,
      srsLevel: Number(r.srs_level),
      state,
    });

    byState[state]++;

    if (state === 'critical') {
      criticalCandidates.push({
        id: Number(r.id),
        isLeech,
        nextReviewAt: r.next_review_at,
      });
    }
  }

  criticalCandidates.sort((a, b) => {
    if (a.isLeech !== b.isLeech) {
      return a.isLeech ? -1 : 1;
    }
    const aTime = a.nextReviewAt ? Date.parse(a.nextReviewAt) : Number.POSITIVE_INFINITY;
    const bTime = b.nextReviewAt ? Date.parse(b.nextReviewAt) : Number.POSITIVE_INFINITY;
    const validA = Number.isFinite(aTime) ? aTime : Number.POSITIVE_INFINITY;
    const validB = Number.isFinite(bTime) ? bTime : Number.POSITIVE_INFINITY;
    if (validA !== validB) {
      return validA - validB;
    }
    return a.id - b.id;
  });

  const criticalIds = criticalCandidates.slice(0, 100).map((cand) => cand.id);

  const response: HeatmapResponse = {
    cells,
    byState,
    criticalIds,
  };

  return c.json(response);
});


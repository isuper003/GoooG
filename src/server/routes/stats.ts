import { Hono } from 'hono';
import { queryAll, queryOne } from '../db';
import type { StatsOverview, CategoryStats } from '../../shared/types';
import type { AppEnv } from '../app';

interface SessionsStatsRow {
  games_played: number;
  total_rounds: number;
}

interface CharactersTotalsRow {
  total_correct: number;
  total_wrong: number;
}

interface CategoryTotalsRow {
  key: string;
  correct: number;
  wrong: number;
}

export const statsRouter = new Hono<AppEnv>();

// GET /api/stats/overview
statsRouter.get('/overview', async (c) => {
  const [sessionsStats, charactersTotals, categoryTotals] = await Promise.all([
    queryOne<SessionsStatsRow>(
      c.env.DB,
      `SELECT
         COUNT(*) AS games_played,
         COALESCE(SUM(total_rounds_played), 0) AS total_rounds
       FROM game_sessions
       WHERE status = 'completed'`
    ),
    queryOne<CharactersTotalsRow>(
      c.env.DB,
      `SELECT
         COALESCE(SUM(correct_count), 0) AS total_correct,
         COALESCE(SUM(wrong_count), 0) AS total_wrong
       FROM characters`
    ),
    queryAll<CategoryTotalsRow>(
      c.env.DB,
      `SELECT
         cat.key,
         COALESCE(SUM(c.correct_count), 0) AS correct,
         COALESCE(SUM(c.wrong_count), 0) AS wrong
       FROM categories cat
       LEFT JOIN characters c ON cat.id = c.category_id
       GROUP BY cat.id, cat.key, cat.sort_order
       ORDER BY cat.sort_order ASC`
    ),
  ]);

  const totalCorrect = Number(charactersTotals?.total_correct || 0);
  const totalWrong = Number(charactersTotals?.total_wrong || 0);
  const totalRounds = totalCorrect + totalWrong;
  const overallAccuracy =
    totalRounds > 0 ? Number((totalCorrect / totalRounds).toFixed(4)) : 0;

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
    totalRoundsAnswered: Number(sessionsStats?.total_rounds || 0),
    overallAccuracy,
    byCategory,
  };

  return c.json(response);
});

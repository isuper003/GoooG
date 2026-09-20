import { Hono } from 'hono';
import { queryAll, queryOne } from '../db';
import type { StatsOverview, CategoryStats } from '../../shared/types';
import type { AppEnv } from '../app';

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

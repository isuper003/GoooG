import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';
import { queryAll, queryOne } from '../db';
import type {
  BackupCharacter,
  BackupGameSession,
  BackupData18Favorite,
  BackupSummary,
  FullAppBackup,
  FullBackupImportResponse,
} from '../../shared/backupTypes';
import type { Data18WatchLaterBackupItem } from '../../shared/data18Types';

export const backupRouter = new Hono<AppEnv>();

function database(c: Context<AppEnv>): D1Database | null {
  return c.env?.DB ?? null;
}

// GET /api/backup/summary - Quick statistics of current system state
backupRouter.get('/summary', async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const [chars, labels, sessions, answers, favorites, watchLater] = await Promise.all([
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM characters'),
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM labels'),
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM game_sessions'),
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM game_answers'),
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM data18_favorites'),
    queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM data18_watch_later'),
  ]);

  const summary: BackupSummary = {
    charactersCount: chars?.n ?? 0,
    labelsCount: labels?.n ?? 0,
    gameSessionsCount: sessions?.n ?? 0,
    gameAnswersCount: answers?.n ?? 0,
    data18FavoritesCount: favorites?.n ?? 0,
    data18WatchLaterCount: watchLater?.n ?? 0,
  };

  return c.json(summary);
});

// GET /api/backup/export - Generates the complete JSON backup
backupRouter.get('/export', async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  // 1. Categories mapping
  const categoryRows = await queryAll<{ id: number; key: string }>(db, 'SELECT id, key FROM categories');
  const catIdToKey = new Map<number, 'trans' | 'sluts' | 'twinks'>();
  for (const cat of categoryRows) {
    catIdToKey.set(cat.id, cat.key as 'trans' | 'sluts' | 'twinks');
  }

  // 2. Labels
  const labelRows = await queryAll<{ name: string; created_at: string }>(
    db,
    'SELECT name, created_at FROM labels ORDER BY name ASC'
  );

  // 3. Characters, Images, and Character-Labels
  const charRows = await queryAll<{
    id: number;
    name: string;
    category_id: number;
    correct_count: number;
    wrong_count: number;
    srs_level: number;
    is_active: number;
    next_review_at: string | null;
    last_reviewed_at: string | null;
    interval_hours: number | null;
    is_leech: number;
    leech_streak: number;
    created_at: string;
    updated_at: string;
  }>(db, 'SELECT * FROM characters ORDER BY id ASC');

  const imageRows = await queryAll<{
    character_id: number;
    url: string;
    position: number;
  }>(db, 'SELECT character_id, url, position FROM character_images ORDER BY character_id ASC, position ASC');

  const charLabelRows = await queryAll<{
    character_id: number;
    name: string;
  }>(db, 'SELECT cl.character_id, l.name FROM character_labels cl JOIN labels l ON cl.label_id = l.id');

  const imagesByChar = new Map<number, { url: string; position: number }[]>();
  for (const img of imageRows) {
    const list = imagesByChar.get(img.character_id) || [];
    list.push({ url: img.url, position: img.position });
    imagesByChar.set(img.character_id, list);
  }

  const labelsByChar = new Map<number, string[]>();
  for (const cl of charLabelRows) {
    const list = labelsByChar.get(cl.character_id) || [];
    list.push(cl.name);
    labelsByChar.set(cl.character_id, list);
  }

  const backupCharacters: BackupCharacter[] = charRows.map((char) => ({
    name: char.name,
    categoryKey: catIdToKey.get(char.category_id) ?? 'sluts',
    correctCount: char.correct_count,
    wrongCount: char.wrong_count,
    srsLevel: char.srs_level,
    isActive: Boolean(char.is_active),
    nextReviewAt: char.next_review_at,
    lastReviewedAt: char.last_reviewed_at,
    intervalHours: char.interval_hours,
    isLeech: Boolean(char.is_leech),
    leechStreak: char.leech_streak,
    createdAt: char.created_at,
    updatedAt: char.updated_at,
    images: imagesByChar.get(char.id) || [],
    labelNames: labelsByChar.get(char.id) || [],
  }));

  // 4. Game Sessions & Game Answers
  const sessionRows = await queryAll<{
    id: number;
    scope: 'trans' | 'sluts' | 'twinks' | 'mix';
    mode: 'classic' | 'match';
    planned_rounds: number | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    started_at: string;
    finished_at: string | null;
    total_rounds_played: number;
    total_correct: number;
    total_wrong: number;
    remediation_rounds_played: number;
    preset: string | null;
  }>(db, 'SELECT * FROM game_sessions ORDER BY id ASC');

  const answerRows = await queryAll<{
    session_id: number;
    character_name: string;
    selected_character_name: string | null;
    phase: 'main' | 'remediation';
    is_correct: number;
    round_index: number;
    srs_level_before: number;
    srs_level_after: number;
    elapsed_ms: number | null;
    fluency: string | null;
    answered_at: string;
  }>(
    db,
    `SELECT ga.session_id, c.name as character_name, sc.name as selected_character_name,
            ga.phase, ga.is_correct, ga.round_index, ga.srs_level_before, ga.srs_level_after,
            ga.elapsed_ms, ga.fluency, ga.answered_at
     FROM game_answers ga
     JOIN characters c ON ga.character_id = c.id
     LEFT JOIN characters sc ON ga.selected_character_id = sc.id
     ORDER BY ga.session_id ASC, ga.round_index ASC`
  );

  const answersBySession = new Map<number, BackupGameSession['answers']>();
  for (const ans of answerRows) {
    const list = answersBySession.get(ans.session_id) || [];
    list.push({
      characterName: ans.character_name,
      selectedCharacterName: ans.selected_character_name,
      phase: ans.phase,
      isCorrect: Boolean(ans.is_correct),
      roundIndex: ans.round_index,
      srsLevelBefore: ans.srs_level_before,
      srsLevelAfter: ans.srs_level_after,
      elapsedMs: ans.elapsed_ms,
      fluency: ans.fluency,
      answeredAt: ans.answered_at,
    });
    answersBySession.set(ans.session_id, list);
  }

  const backupSessions: BackupGameSession[] = sessionRows.map((sess) => ({
    scope: sess.scope,
    mode: sess.mode,
    preset: sess.preset,
    plannedRounds: sess.planned_rounds,
    status: sess.status,
    startedAt: sess.started_at,
    finishedAt: sess.finished_at,
    totalRoundsPlayed: sess.total_rounds_played,
    totalCorrect: sess.total_correct,
    totalWrong: sess.total_wrong,
    remediationRoundsPlayed: sess.remediation_rounds_played,
    answers: answersBySession.get(sess.id) || [],
  }));

  // 5. Data18 Favorites (المتابع)
  const favoriteRows = await queryAll<{
    path: string;
    kind: 'performer' | 'studio' | 'site' | 'network' | 'series';
    slug: string;
    name: string;
    last_seen_scene_id: string | null;
    created_at: string;
  }>(db, 'SELECT path, kind, slug, name, last_seen_scene_id, created_at FROM data18_favorites ORDER BY id ASC');

  const backupFavorites: BackupData18Favorite[] = favoriteRows.map((f) => ({
    path: f.path,
    kind: f.kind,
    slug: f.slug,
    name: f.name,
    lastSeenSceneId: f.last_seen_scene_id,
    createdAt: f.created_at,
  }));

  // 6. Data18 Watch Later
  const watchLaterRows = await queryAll<{
    item_type: 'scene' | 'movie';
    item_id: string;
    title: string;
    slug: string | null;
    url: string;
    image_url: string | null;
    release_date: string | null;
    duration: string | null;
    studio_name: string | null;
    studio_slug: string | null;
    cast_json: string | null;
    is_watched: number;
    notes: string | null;
    created_at: string;
    watched_at: string | null;
  }>(db, 'SELECT * FROM data18_watch_later ORDER BY id ASC');

  const backupWatchLater: Data18WatchLaterBackupItem[] = watchLaterRows.map((wl) => {
    let cast: { name: string; slug: string }[] | undefined = undefined;
    if (wl.cast_json) {
      try {
        cast = JSON.parse(wl.cast_json);
      } catch {
        // ignore
      }
    }
    return {
      itemType: wl.item_type,
      itemId: wl.item_id,
      title: wl.title,
      slug: wl.slug ?? undefined,
      url: wl.url,
      imageUrl: wl.image_url ?? undefined,
      releaseDate: wl.release_date,
      duration: wl.duration,
      studio: wl.studio_name ? { name: wl.studio_name, slug: wl.studio_slug || '' } : null,
      cast,
      isWatched: Boolean(wl.is_watched),
      notes: wl.notes,
      createdAt: wl.created_at,
      watchedAt: wl.watched_at,
    };
  });

  const today = new Date().toISOString().split('T')[0];
  const fullBackup: FullAppBackup = {
    version: 1,
    app: 'GoooG',
    exportedAt: new Date().toISOString(),
    summary: {
      charactersCount: backupCharacters.length,
      labelsCount: labelRows.length,
      gameSessionsCount: backupSessions.length,
      gameAnswersCount: answerRows.length,
      data18FavoritesCount: backupFavorites.length,
      data18WatchLaterCount: backupWatchLater.length,
    },
    data: {
      labels: labelRows.map((l) => ({ name: l.name, createdAt: l.created_at })),
      characters: backupCharacters,
      gameSessions: backupSessions,
      data18Favorites: backupFavorites,
      data18WatchLater: backupWatchLater,
    },
  };

  c.header('Content-Disposition', `attachment; filename="gooog-full-backup-${today}.json"`);
  return c.json(fullBackup);
});

const fullBackupImportSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  backup: z.object({
    version: z.literal(1),
    app: z.string().optional(),
    data: z.object({
      labels: z.array(z.object({ name: z.string(), createdAt: z.string().optional() })).optional().default([]),
      characters: z.array(
        z.object({
          name: z.string().min(1),
          categoryKey: z.enum(['trans', 'sluts', 'twinks']),
          correctCount: z.number().default(0),
          wrongCount: z.number().default(0),
          srsLevel: z.number().default(0),
          isActive: z.boolean().default(true),
          nextReviewAt: z.string().nullable().optional(),
          lastReviewedAt: z.string().nullable().optional(),
          intervalHours: z.number().nullable().optional(),
          isLeech: z.boolean().default(false),
          leechStreak: z.number().default(0),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          images: z.array(z.object({ url: z.string(), position: z.number() })).optional().default([]),
          labelNames: z.array(z.string()).optional().default([]),
        })
      ).optional().default([]),
      gameSessions: z.array(
        z.object({
          scope: z.enum(['trans', 'sluts', 'twinks', 'mix']),
          mode: z.enum(['classic', 'match']),
          preset: z.string().nullable().optional(),
          plannedRounds: z.number().nullable().optional(),
          status: z.enum(['in_progress', 'completed', 'abandoned']).default('completed'),
          startedAt: z.string(),
          finishedAt: z.string().nullable().optional(),
          totalRoundsPlayed: z.number().default(0),
          totalCorrect: z.number().default(0),
          totalWrong: z.number().default(0),
          remediationRoundsPlayed: z.number().default(0),
          answers: z.array(
            z.object({
              characterName: z.string(),
              selectedCharacterName: z.string().nullable().optional(),
              phase: z.enum(['main', 'remediation']).default('main'),
              isCorrect: z.boolean(),
              roundIndex: z.number(),
              srsLevelBefore: z.number().default(0),
              srsLevelAfter: z.number().default(0),
              elapsedMs: z.number().nullable().optional(),
              fluency: z.string().nullable().optional(),
              answeredAt: z.string(),
            })
          ).optional().default([]),
        })
      ).optional().default([]),
      data18Favorites: z.array(
        z.object({
          path: z.string(),
          kind: z.enum(['performer', 'studio', 'site', 'network', 'series']),
          slug: z.string(),
          name: z.string(),
          lastSeenSceneId: z.string().nullable().optional(),
          createdAt: z.string().optional(),
        })
      ).optional().default([]),
      data18WatchLater: z.array(
        z.object({
          itemType: z.enum(['scene', 'movie']),
          itemId: z.string(),
          title: z.string(),
          slug: z.string().optional(),
          url: z.string(),
          imageUrl: z.string().optional(),
          releaseDate: z.string().nullable().optional(),
          duration: z.string().nullable().optional(),
          studio: z.object({ name: z.string(), slug: z.string() }).nullable().optional(),
          cast: z.array(z.object({ name: z.string(), slug: z.string() })).optional(),
          isWatched: z.boolean().default(false),
          notes: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          watchedAt: z.string().nullable().optional(),
        })
      ).optional().default([]),
    }),
  }),
});

// POST /api/backup/import - Restores or merges full backup into database
backupRouter.post('/import', zValidator('json', fullBackupImportSchema), async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const { mode, backup } = c.req.valid('json');
  const { labels, characters, gameSessions, data18Favorites, data18WatchLater } = backup.data;

  // 1. If replace mode: clean dependent tables
  if (mode === 'replace') {
    await db.batch([
      db.prepare('DELETE FROM game_answers'),
      db.prepare('DELETE FROM game_sessions'),
      db.prepare('DELETE FROM character_labels'),
      db.prepare('DELETE FROM character_images'),
      db.prepare('DELETE FROM characters'),
      db.prepare('DELETE FROM labels'),
      db.prepare('DELETE FROM data18_favorites'),
      db.prepare('DELETE FROM data18_watch_later'),
    ]);
  }

  // 2. Ensure categories and fetch category key -> id mapping
  const categoryRows = await queryAll<{ id: number; key: string }>(db, 'SELECT id, key FROM categories');
  const catKeyToId = new Map<string, number>();
  for (const cat of categoryRows) {
    catKeyToId.set(cat.key, cat.id);
  }

  // 3. Insert Labels
  if (labels.length > 0) {
    const labelStmts = labels.map((l) =>
      db.prepare('INSERT OR IGNORE INTO labels (name, created_at) VALUES (?, ?)').bind(l.name, l.createdAt ?? new Date().toISOString())
    );
    for (let i = 0; i < labelStmts.length; i += 50) {
      await db.batch(labelStmts.slice(i, i + 50));
    }
  }

  // Reload all labels to map name -> id
  const allLabels = await queryAll<{ id: number; name: string }>(db, 'SELECT id, name FROM labels');
  const labelNameToId = new Map<string, number>();
  for (const l of allLabels) {
    labelNameToId.set(l.name.toLowerCase(), l.id);
  }

  // 4. Insert or Merge Characters.
  //
  // A real library-sized backup (hundreds of characters, each with several images) would
  // previously drive one round trip per character just to check for a merge match, plus
  // another to insert/update it, plus one more per image and per label — easily 1,000+
  // sequential awaited D1 calls for a 150-character backup. That routinely runs past
  // Cloudflare's request time budget and fails the import midway. Everything below is
  // instead resolved with a handful of bulk reads and writes executed via `db.batch(...)`.
  const now = new Date().toISOString();
  const BATCH_SIZE = 50;
  const charKey = (categoryId: number, name: string) => `${categoryId}::${name.trim().toLowerCase()}`;

  interface PendingChar {
    input: (typeof characters)[number];
    catId: number;
    charId: number | null;
  }

  const existingCharRows =
    mode === 'merge'
      ? await queryAll<{ id: number; name: string; category_id: number }>(
          db,
          'SELECT id, name, category_id FROM characters'
        )
      : [];
  const existingCharMap = new Map<string, number>();
  for (const row of existingCharRows) {
    existingCharMap.set(charKey(row.category_id, row.name), row.id);
  }

  // One pending entry per input character, always keeping that character's own images/labels —
  // even when its (category, name) key is shared with an earlier entry in this same payload
  // (both then resolve to the same charId below, but each still contributes its own images).
  // `pendingNewByKey` tracks only which key gets the actual INSERT, so a name duplicated
  // within one backup file still creates a single character row rather than two.
  const pending: PendingChar[] = [];
  const pendingNewByKey = new Map<string, PendingChar>();
  for (const char of characters) {
    const catId = catKeyToId.get(char.categoryKey) ?? 1;
    const key = charKey(catId, char.name);
    const matchedId = existingCharMap.get(key) ?? null;
    const entry: PendingChar = { input: char, catId, charId: matchedId };
    pending.push(entry);
    if (matchedId === null && !pendingNewByKey.has(key)) {
      pendingNewByKey.set(key, entry);
    }
  }

  // 4a. Batch-update existing merge matches.
  const updateStmts: D1PreparedStatement[] = pending
    .filter((p) => p.charId !== null)
    .map((p) => {
      const char = p.input;
      return db
        .prepare(
          `UPDATE characters SET
            correct_count = MAX(correct_count, ?),
            wrong_count = MAX(wrong_count, ?),
            srs_level = ?,
            is_active = ?,
            next_review_at = COALESCE(?, next_review_at),
            last_reviewed_at = COALESCE(?, last_reviewed_at),
            interval_hours = COALESCE(?, interval_hours),
            is_leech = ?,
            leech_streak = ?,
            updated_at = ?
          WHERE id = ?`
        )
        .bind(
          char.correctCount,
          char.wrongCount,
          char.srsLevel,
          char.isActive ? 1 : 0,
          char.nextReviewAt ?? null,
          char.lastReviewedAt ?? null,
          char.intervalHours ?? null,
          char.isLeech ? 1 : 0,
          char.leechStreak,
          now,
          p.charId
        );
    });
  for (let i = 0; i < updateStmts.length; i += BATCH_SIZE) {
    await db.batch(updateStmts.slice(i, i + BATCH_SIZE));
  }

  // 4b. Batch-insert genuinely new characters (deduped, see above).
  const toInsert = Array.from(pendingNewByKey.values());
  const insertStmts: D1PreparedStatement[] = toInsert.map((p) => {
    const char = p.input;
    return db
      .prepare(
        `INSERT INTO characters (
          name, category_id, correct_count, wrong_count, srs_level, is_active,
          next_review_at, last_reviewed_at, interval_hours, is_leech, leech_streak,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        char.name,
        p.catId,
        char.correctCount,
        char.wrongCount,
        char.srsLevel,
        char.isActive ? 1 : 0,
        char.nextReviewAt ?? null,
        char.lastReviewedAt ?? null,
        char.intervalHours ?? null,
        char.isLeech ? 1 : 0,
        char.leechStreak,
        char.createdAt ?? now,
        char.updatedAt ?? now
      );
  });
  for (let i = 0; i < insertStmts.length; i += BATCH_SIZE) {
    await db.batch(insertStmts.slice(i, i + BATCH_SIZE));
  }
  const importedCharsCount = toInsert.length;

  // Resolve ids for every pending entry still missing one — the just-inserted rows, and any
  // duplicate entries that share a key with one of them — in one pass instead of one SELECT
  // per insert.
  const unresolved = pending.filter((p) => p.charId === null);
  if (unresolved.length > 0) {
    const refreshed = await queryAll<{ id: number; name: string; category_id: number }>(
      db,
      'SELECT id, name, category_id FROM characters'
    );
    const refreshedMap = new Map<string, number>();
    for (const row of refreshed) {
      refreshedMap.set(charKey(row.category_id, row.name), row.id);
    }
    for (const p of unresolved) {
      p.charId = refreshedMap.get(charKey(p.catId, p.input.name)) ?? null;
    }
  }

  // 4c. Images for every input character, batched across the whole payload. `character_images`
  // has UNIQUE(character_id, position) as well as UNIQUE(character_id, url), so re-inserting an
  // existing character's images at their originally-exported positions (which start at 0) would
  // collide with that character's current images and get silently dropped by INSERT OR IGNORE —
  // merge mode would then add no new photos to a character that already has any. Instead, skip
  // images the character already has (by URL) and slot the rest into the next free position.
  const allExistingImages = await queryAll<{ character_id: number; url: string; position: number }>(
    db,
    'SELECT character_id, url, position FROM character_images'
  );
  interface ImageBucket {
    urls: Set<string>;
    usedPositions: Set<number>;
    nextFree: number;
  }
  const imagesByChar = new Map<number, ImageBucket>();
  const bucketFor = (characterId: number): ImageBucket => {
    let bucket = imagesByChar.get(characterId);
    if (!bucket) {
      bucket = { urls: new Set(), usedPositions: new Set(), nextFree: 0 };
      imagesByChar.set(characterId, bucket);
    }
    return bucket;
  };
  for (const row of allExistingImages) {
    const bucket = bucketFor(row.character_id);
    bucket.urls.add(row.url);
    bucket.usedPositions.add(row.position);
    bucket.nextFree = Math.max(bucket.nextFree, row.position + 1);
  }

  const imageStmts: D1PreparedStatement[] = [];
  for (const p of pending) {
    if (!p.charId || !p.input.images || p.input.images.length === 0) continue;
    const bucket = bucketFor(p.charId);
    for (const img of p.input.images) {
      if (bucket.urls.has(img.url)) continue;
      const position = bucket.usedPositions.has(img.position) ? bucket.nextFree : img.position;
      bucket.usedPositions.add(position);
      bucket.nextFree = Math.max(bucket.nextFree, position + 1);
      bucket.urls.add(img.url);
      imageStmts.push(
        db
          .prepare('INSERT OR IGNORE INTO character_images (character_id, url, position) VALUES (?, ?, ?)')
          .bind(p.charId, img.url, position)
      );
    }
  }
  for (let i = 0; i < imageStmts.length; i += BATCH_SIZE) {
    await db.batch(imageStmts.slice(i, i + BATCH_SIZE));
  }

  // 4d. Labels for every input character, batched the same way.
  const characterLabelStmts: D1PreparedStatement[] = [];
  for (const p of pending) {
    if (!p.charId || !p.input.labelNames || p.input.labelNames.length === 0) continue;
    for (const lName of p.input.labelNames) {
      const lId = labelNameToId.get(lName.toLowerCase());
      if (lId) {
        characterLabelStmts.push(
          db.prepare('INSERT OR IGNORE INTO character_labels (character_id, label_id) VALUES (?, ?)').bind(p.charId, lId)
        );
      }
    }
  }
  for (let i = 0; i < characterLabelStmts.length; i += BATCH_SIZE) {
    await db.batch(characterLabelStmts.slice(i, i + BATCH_SIZE));
  }

  // Reload character name -> id for resolving game answers
  const allChars = await queryAll<{ id: number; name: string }>(db, 'SELECT id, name FROM characters');
  const charNameToId = new Map<string, number>();
  for (const c of allChars) {
    charNameToId.set(c.name.toLowerCase(), c.id);
  }

  // 5. Game Sessions & Game Answers
  let importedAnswersCount = 0;
  for (const sess of gameSessions) {
    let sessId: number | null = null;
    if (mode === 'merge') {
      const existing = await queryOne<{ id: number }>(
        db,
        'SELECT id FROM game_sessions WHERE started_at = ?',
        sess.startedAt
      );
      if (existing) sessId = existing.id;
    }

    if (!sessId) {
      await db
        .prepare(
          `INSERT INTO game_sessions (
            scope, mode, planned_rounds, status, started_at, finished_at,
            total_rounds_played, total_correct, total_wrong, remediation_rounds_played, preset
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          sess.scope,
          sess.mode,
          sess.plannedRounds ?? null,
          sess.status,
          sess.startedAt,
          sess.finishedAt ?? null,
          sess.totalRoundsPlayed,
          sess.totalCorrect,
          sess.totalWrong,
          sess.remediationRoundsPlayed,
          sess.preset ?? null
        )
        .run();

      const createdSess = await queryOne<{ id: number }>(
        db,
        'SELECT id FROM game_sessions WHERE started_at = ?',
        sess.startedAt
      );
      sessId = createdSess?.id ?? null;
    }

    if (sessId && sess.answers && sess.answers.length > 0) {
      const answerStmts = sess.answers
        .map((ans) => {
          const charId = charNameToId.get(ans.characterName.toLowerCase());
          if (!charId) return null;
          const selectedId = ans.selectedCharacterName
            ? charNameToId.get(ans.selectedCharacterName.toLowerCase()) ?? null
            : null;

          return db
            .prepare(
              `INSERT OR IGNORE INTO game_answers (
                session_id, character_id, phase, is_correct, round_index,
                srs_level_before, srs_level_after, answered_at,
                selected_character_id, elapsed_ms, fluency
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              sessId,
              charId,
              ans.phase,
              ans.isCorrect ? 1 : 0,
              ans.roundIndex,
              ans.srsLevelBefore,
              ans.srsLevelAfter,
              ans.answeredAt,
              selectedId,
              ans.elapsedMs ?? null,
              ans.fluency ?? null
            );
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      for (let i = 0; i < answerStmts.length; i += 50) {
        const batch = answerStmts.slice(i, i + 50);
        await db.batch(batch);
        importedAnswersCount += batch.length;
      }
    }
  }

  // 6. Data18 Favorites (المتابع)
  if (data18Favorites.length > 0) {
    const favStmts = data18Favorites.map((f) =>
      db
        .prepare(
          `INSERT INTO data18_favorites (path, kind, slug, name, last_seen_scene_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(path) DO UPDATE SET
             name = excluded.name,
             last_seen_scene_id = COALESCE(excluded.last_seen_scene_id, data18_favorites.last_seen_scene_id)`
        )
        .bind(
          f.path,
          f.kind,
          f.slug,
          f.name,
          f.lastSeenSceneId ?? null,
          f.createdAt ?? new Date().toISOString()
        )
    );
    for (let i = 0; i < favStmts.length; i += 50) {
      await db.batch(favStmts.slice(i, i + 50));
    }
  }

  // 7. Data18 Watch Later
  if (data18WatchLater.length > 0) {
    const wlStmts = data18WatchLater.map((wl) => {
      const castJson = wl.cast ? JSON.stringify(wl.cast) : null;
      const isWatchedNum = wl.isWatched ? 1 : 0;
      const createdAt = wl.createdAt ?? new Date().toISOString();
      const watchedAt = wl.watchedAt ?? (wl.isWatched ? new Date().toISOString() : null);

      return db
        .prepare(
          `INSERT INTO data18_watch_later (
            item_type, item_id, title, slug, url, image_url, release_date,
            duration, studio_name, studio_slug, cast_json, is_watched, notes, created_at, watched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(item_type, item_id) DO UPDATE SET
            title = excluded.title,
            slug = excluded.slug,
            url = excluded.url,
            image_url = excluded.image_url,
            release_date = excluded.release_date,
            duration = excluded.duration,
            studio_name = excluded.studio_name,
            studio_slug = excluded.studio_slug,
            cast_json = excluded.cast_json,
            is_watched = excluded.is_watched,
            notes = COALESCE(excluded.notes, data18_watch_later.notes)`
        )
        .bind(
          wl.itemType,
          wl.itemId,
          wl.title,
          wl.slug ?? null,
          wl.url,
          wl.imageUrl ?? null,
          wl.releaseDate ?? null,
          wl.duration ?? null,
          wl.studio?.name ?? null,
          wl.studio?.slug ?? null,
          castJson,
          isWatchedNum,
          wl.notes ?? null,
          createdAt,
          watchedAt
        );
    });

    for (let i = 0; i < wlStmts.length; i += 50) {
      await db.batch(wlStmts.slice(i, i + 50));
    }
  }

  const response: FullBackupImportResponse = {
    ok: true,
    mode,
    imported: {
      // Genuinely new rows, not the raw submitted count: a name repeated in the payload,
      // or one that already matched an existing character in merge mode, is merged into
      // one row rather than creating a duplicate — reporting `characters.length` here would
      // overstate how many characters were actually added.
      characters: importedCharsCount,
      labels: labels.length,
      gameSessions: gameSessions.length,
      gameAnswers: importedAnswersCount,
      data18Favorites: data18Favorites.length,
      data18WatchLater: data18WatchLater.length,
    },
  };

  return c.json(response);
});

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { backupRouter } from './backup';
import type { AppEnv } from '../app';
import type { FullAppBackup } from '../../shared/backupTypes';

function fakeDb() {
  const categories = [
    { id: 1, key: 'trans', label: 'Trans', sort_order: 1 },
    { id: 2, key: 'sluts', label: 'Sluts', sort_order: 2 },
    { id: 3, key: 'twinks', label: 'Twinks', sort_order: 3 },
  ];

  const labels: { id: number; name: string; created_at: string }[] = [];
  const characters: {
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
  }[] = [];
  const characterImages: { id: number; character_id: number; url: string; position: number }[] = [];
  const characterLabels: { character_id: number; label_id: number }[] = [];
  const gameSessions: {
    id: number;
    scope: string;
    mode: string;
    planned_rounds: number | null;
    status: string;
    started_at: string;
    finished_at: string | null;
    total_rounds_played: number;
    total_correct: number;
    total_wrong: number;
    remediation_rounds_played: number;
    preset: string | null;
  }[] = [];
  const gameAnswers: {
    id: number;
    session_id: number;
    character_id: number;
    selected_character_id: number | null;
    phase: string;
    is_correct: number;
    round_index: number;
    srs_level_before: number;
    srs_level_after: number;
    elapsed_ms: number | null;
    fluency: string | null;
    answered_at: string;
  }[] = [];
  const data18Favorites: {
    id: number;
    path: string;
    kind: string;
    slug: string;
    name: string;
    last_seen_scene_id: string | null;
    created_at: string;
  }[] = [];
  const data18WatchLater: {
    id: number;
    item_type: string;
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
  }[] = [];

  let nextLabelId = 1;
  let nextCharId = 1;
  let nextSessionId = 1;
  let nextAnswerId = 1;

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('DELETE FROM')) {
      if (sql.includes('game_answers')) gameAnswers.length = 0;
      else if (sql.includes('game_sessions')) gameSessions.length = 0;
      else if (sql.includes('character_labels')) characterLabels.length = 0;
      else if (sql.includes('character_images')) characterImages.length = 0;
      else if (sql.includes('characters')) characters.length = 0;
      else if (sql.includes('labels')) labels.length = 0;
      else if (sql.includes('data18_favorites')) data18Favorites.length = 0;
      else if (sql.includes('data18_watch_later')) data18WatchLater.length = 0;
    } else if (sql.startsWith('INSERT OR IGNORE INTO labels')) {
      const [name, created_at] = args as [string, string];
      if (!labels.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
        labels.push({ id: nextLabelId++, name, created_at });
      }
    } else if (sql.startsWith('INSERT INTO characters')) {
      const [
        name,
        category_id,
        correct_count,
        wrong_count,
        srs_level,
        is_active,
        next_review_at,
        last_reviewed_at,
        interval_hours,
        is_leech,
        leech_streak,
        created_at,
        updated_at,
      ] = args as [
        string,
        number,
        number,
        number,
        number,
        number,
        string | null,
        string | null,
        number | null,
        number,
        number,
        string,
        string
      ];
      characters.push({
        id: nextCharId++,
        name,
        category_id,
        correct_count,
        wrong_count,
        srs_level,
        is_active,
        next_review_at,
        last_reviewed_at,
        interval_hours,
        is_leech,
        leech_streak,
        created_at,
        updated_at,
      });
    } else if (sql.startsWith('UPDATE characters SET')) {
      const charId = args[args.length - 1] as number;
      const char = characters.find((c) => c.id === charId);
      if (char) {
        char.correct_count = Math.max(char.correct_count, args[0] as number);
        char.wrong_count = Math.max(char.wrong_count, args[1] as number);
        char.srs_level = args[2] as number;
        char.is_active = args[3] as number;
        char.is_leech = args[7] as number;
        char.leech_streak = args[8] as number;
      }
    } else if (sql.startsWith('INSERT OR IGNORE INTO character_images')) {
      const [character_id, url, position] = args as [number, string, number];
      if (!characterImages.some((ci) => ci.character_id === character_id && ci.url === url)) {
        characterImages.push({ id: characterImages.length + 1, character_id, url, position });
      }
    } else if (sql.startsWith('INSERT OR IGNORE INTO character_labels')) {
      const [character_id, label_id] = args as [number, number];
      if (!characterLabels.some((cl) => cl.character_id === character_id && cl.label_id === label_id)) {
        characterLabels.push({ character_id, label_id });
      }
    } else if (sql.startsWith('INSERT INTO game_sessions')) {
      const [
        scope,
        mode,
        planned_rounds,
        status,
        started_at,
        finished_at,
        total_rounds_played,
        total_correct,
        total_wrong,
        remediation_rounds_played,
        preset,
      ] = args as [
        string,
        string,
        number | null,
        string,
        string,
        string | null,
        number,
        number,
        number,
        number,
        string | null
      ];
      gameSessions.push({
        id: nextSessionId++,
        scope,
        mode,
        planned_rounds,
        status,
        started_at,
        finished_at,
        total_rounds_played,
        total_correct,
        total_wrong,
        remediation_rounds_played,
        preset,
      });
    } else if (sql.startsWith('INSERT OR IGNORE INTO game_answers')) {
      const [
        session_id,
        character_id,
        phase,
        is_correct,
        round_index,
        srs_level_before,
        srs_level_after,
        answered_at,
        selected_character_id,
        elapsed_ms,
        fluency,
      ] = args as [
        number,
        number,
        string,
        number,
        number,
        number,
        number,
        string,
        number | null,
        number | null,
        string | null
      ];
      gameAnswers.push({
        id: nextAnswerId++,
        session_id,
        character_id,
        selected_character_id,
        phase,
        is_correct,
        round_index,
        srs_level_before,
        srs_level_after,
        elapsed_ms,
        fluency,
        answered_at,
      });
    } else if (sql.startsWith('INSERT INTO data18_favorites')) {
      const [path, kind, slug, name, last_seen, created_at] = args as [
        string,
        string,
        string,
        string,
        string | null,
        string
      ];
      const ex = data18Favorites.find((f) => f.path === path);
      if (ex) {
        ex.name = name;
        if (last_seen) ex.last_seen_scene_id = last_seen;
      } else {
        data18Favorites.push({
          id: data18Favorites.length + 1,
          path,
          kind,
          slug,
          name,
          last_seen_scene_id: last_seen,
          created_at,
        });
      }
    } else if (sql.startsWith('INSERT INTO data18_watch_later')) {
      const [
        item_type,
        item_id,
        title,
        slug,
        url,
        image_url,
        release_date,
        duration,
        studio_name,
        studio_slug,
        cast_json,
        is_watched,
        notes,
        created_at,
        watched_at,
      ] = args as [
        string,
        string,
        string,
        string | null,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        string | null,
        string,
        string | null
      ];
      const ex = data18WatchLater.find((wl) => wl.item_type === item_type && wl.item_id === item_id);
      if (ex) {
        ex.title = title;
        ex.is_watched = is_watched;
      } else {
        data18WatchLater.push({
          id: data18WatchLater.length + 1,
          item_type,
          item_id,
          title,
          slug,
          url,
          image_url,
          release_date,
          duration,
          studio_name,
          studio_slug,
          cast_json,
          is_watched,
          notes,
          created_at,
          watched_at,
        });
      }
    }
    return {};
  }

  function statement(sql: string, args: unknown[] = []) {
    return {
      bind: (...bound: unknown[]) => statement(sql, bound),
      first: async () => {
        if (sql.includes('COUNT(*)')) {
          if (sql.includes('characters')) return { n: characters.length };
          if (sql.includes('labels')) return { n: labels.length };
          if (sql.includes('game_sessions')) return { n: gameSessions.length };
          if (sql.includes('game_answers')) return { n: gameAnswers.length };
          if (sql.includes('data18_favorites')) return { n: data18Favorites.length };
          if (sql.includes('data18_watch_later')) return { n: data18WatchLater.length };
        }
        if (sql.includes('FROM characters WHERE category_id = ? AND name = ?')) {
          const [catId, name] = args as [number, string];
          return characters.find((c) => c.category_id === catId && c.name.toLowerCase() === name.toLowerCase()) ?? null;
        }
        if (sql.includes('FROM game_sessions WHERE started_at = ?')) {
          return gameSessions.find((s) => s.started_at === args[0]) ?? null;
        }
        return null;
      },
      all: async () => {
        if (sql.includes('FROM categories')) return { results: categories };
        if (sql.includes('FROM labels')) return { results: labels };
        if (sql.includes('FROM characters')) return { results: characters };
        if (sql.includes('FROM character_images')) {
          if (sql.includes('WHERE character_id = ?')) {
            const [characterId] = args as [number];
            return { results: characterImages.filter((ci) => ci.character_id === characterId) };
          }
          return { results: characterImages };
        }
        if (sql.includes('FROM character_labels')) {
          const res = characterLabels.map((cl) => ({
            character_id: cl.character_id,
            name: labels.find((l) => l.id === cl.label_id)?.name ?? '',
          }));
          return { results: res };
        }
        if (sql.includes('FROM game_sessions')) return { results: gameSessions };
        if (sql.includes('FROM game_answers ga')) {
          const res = gameAnswers.map((ga) => ({
            session_id: ga.session_id,
            character_name: characters.find((c) => c.id === ga.character_id)?.name ?? '',
            selected_character_name: ga.selected_character_id
              ? characters.find((c) => c.id === ga.selected_character_id)?.name ?? null
              : null,
            phase: ga.phase,
            is_correct: ga.is_correct,
            round_index: ga.round_index,
            srs_level_before: ga.srs_level_before,
            srs_level_after: ga.srs_level_after,
            elapsed_ms: ga.elapsed_ms,
            fluency: ga.fluency,
            answered_at: ga.answered_at,
          }));
          return { results: res };
        }
        if (sql.includes('FROM data18_favorites')) return { results: data18Favorites };
        if (sql.includes('FROM data18_watch_later')) return { results: data18WatchLater };
        return { results: [] };
      },
      run: async () => run(sql, args),
      exec: () => run(sql, args),
    };
  }

  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async (statements: { exec: () => unknown }[]) => statements.map((s) => s.exec()),
  } as unknown as D1Database;

  return {
    db,
    characters,
    labels,
    characterImages,
    characterLabels,
    gameSessions,
    gameAnswers,
    data18Favorites,
    data18WatchLater,
  };
}

function makeApp(db: D1Database) {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    (c.env as { DB: D1Database }) = { DB: db };
    await next();
  });
  app.route('/api/backup', backupRouter);
  return app;
}

describe('backupRouter', () => {
  it('returns initial summary with 0 records', async () => {
    const { db } = fakeDb();
    const app = makeApp(db);

    const res = await app.request('/api/backup/summary');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { charactersCount: number; data18FavoritesCount: number };
    expect(body.charactersCount).toBe(0);
    expect(body.data18FavoritesCount).toBe(0);
  });

  it('exports a full app backup', async () => {
    const state = fakeDb();
    state.characters.push({
      id: 1,
      name: 'Cory Chase',
      category_id: 2, // sluts
      correct_count: 10,
      wrong_count: 1,
      srs_level: 4,
      is_active: 1,
      next_review_at: null,
      last_reviewed_at: null,
      interval_hours: 48,
      is_leech: 0,
      leech_streak: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    state.labels.push({ id: 1, name: 'MILF', created_at: '2026-01-01T00:00:00Z' });
    state.characterLabels.push({ character_id: 1, label_id: 1 });
    state.data18Favorites.push({
      id: 1,
      path: '/name/cory-chase',
      kind: 'performer',
      slug: 'cory-chase',
      name: 'Cory Chase',
      last_seen_scene_id: '123',
      created_at: '2026-01-01T00:00:00Z',
    });

    const app = makeApp(state.db);

    const res = await app.request('/api/backup/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="gooog-full-backup-');

    const backup = (await res.json()) as FullAppBackup;
    expect(backup.version).toBe(1);
    expect(backup.app).toBe('GoooG');
    expect(backup.data.characters).toHaveLength(1);
    expect(backup.data.characters[0].name).toBe('Cory Chase');
    expect(backup.data.characters[0].categoryKey).toBe('sluts');
    expect(backup.data.characters[0].labelNames).toContain('MILF');
    expect(backup.data.data18Favorites).toHaveLength(1);
    expect(backup.data.data18Favorites[0].name).toBe('Cory Chase');
  });

  it('imports a backup in merge mode', async () => {
    const state = fakeDb();
    const app = makeApp(state.db);

    const sampleBackup: FullAppBackup = {
      version: 1,
      app: 'GoooG',
      exportedAt: new Date().toISOString(),
      summary: {
        charactersCount: 1,
        labelsCount: 1,
        gameSessionsCount: 0,
        gameAnswersCount: 0,
        data18FavoritesCount: 1,
        data18WatchLaterCount: 1,
      },
      data: {
        labels: [{ name: 'Blonde' }],
        characters: [
          {
            name: 'Angela White',
            categoryKey: 'sluts',
            correctCount: 5,
            wrongCount: 0,
            srsLevel: 3,
            isActive: true,
            isLeech: false,
            leechStreak: 0,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            images: [{ url: 'https://example.com/angela.jpg', position: 0 }],
            labelNames: ['Blonde'],
          },
        ],
        gameSessions: [],
        data18Favorites: [
          {
            path: '/name/angela-white',
            kind: 'performer',
            slug: 'angela-white',
            name: 'Angela White',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        data18WatchLater: [
          {
            itemType: 'scene',
            itemId: '777',
            title: 'Angela Scene',
            url: 'https://www.data18.com/scenes/777',
            isWatched: false,
          },
        ],
      },
    };

    const res = await app.request('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'merge',
        backup: sampleBackup,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; imported: { characters: number } };
    expect(body.ok).toBe(true);
    expect(body.imported.characters).toBe(1);

    expect(state.characters).toHaveLength(1);
    expect(state.characters[0].name).toBe('Angela White');
    expect(state.data18Favorites).toHaveLength(1);
    expect(state.data18WatchLater).toHaveLength(1);
  });

  it('merges new images into an existing character instead of dropping them on position collision', async () => {
    const state = fakeDb();
    // Existing character already has an image occupying position 0 — the exact
    // position every image in a fresh export also starts at.
    state.characters.push({
      id: 1,
      name: 'Angela White',
      category_id: 2, // sluts
      correct_count: 0,
      wrong_count: 0,
      srs_level: 0,
      is_active: 1,
      next_review_at: null,
      last_reviewed_at: null,
      interval_hours: null,
      is_leech: 0,
      leech_streak: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    state.characterImages.push({ id: 1, character_id: 1, url: 'https://example.com/existing.jpg', position: 0 });

    const app = makeApp(state.db);

    const sampleBackup: FullAppBackup = {
      version: 1,
      app: 'GoooG',
      exportedAt: new Date().toISOString(),
      summary: {
        charactersCount: 1,
        labelsCount: 0,
        gameSessionsCount: 0,
        gameAnswersCount: 0,
        data18FavoritesCount: 0,
        data18WatchLaterCount: 0,
      },
      data: {
        labels: [],
        characters: [
          {
            name: 'Angela White',
            categoryKey: 'sluts',
            correctCount: 0,
            wrongCount: 0,
            srsLevel: 0,
            isActive: true,
            isLeech: false,
            leechStreak: 0,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            // Same URL as the existing image at position 0 (should be skipped as a
            // duplicate) plus one genuinely new image, also exported at position 0.
            images: [
              { url: 'https://example.com/existing.jpg', position: 0 },
              { url: 'https://example.com/new.jpg', position: 0 },
            ],
            labelNames: [],
          },
        ],
        gameSessions: [],
        data18Favorites: [],
        data18WatchLater: [],
      },
    };

    const res = await app.request('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'merge', backup: sampleBackup }),
    });

    expect(res.status).toBe(200);
    expect(state.characterImages).toHaveLength(2);
    const urls = state.characterImages.map((ci) => ci.url).sort();
    expect(urls).toEqual(['https://example.com/existing.jpg', 'https://example.com/new.jpg']);
    // The new image must not have collided with the occupied position 0.
    const newImage = state.characterImages.find((ci) => ci.url === 'https://example.com/new.jpg');
    expect(newImage?.position).not.toBe(0);
  });

  it('batch-imports multiple new characters and dedupes a name repeated in the payload', async () => {
    const state = fakeDb();
    const app = makeApp(state.db);

    const makeChar = (name: string, images: { url: string; position: number }[]) => ({
      name,
      categoryKey: 'sluts' as const,
      correctCount: 0,
      wrongCount: 0,
      srsLevel: 0,
      isActive: true,
      isLeech: false,
      leechStreak: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      images,
      labelNames: [],
    });

    const sampleBackup: FullAppBackup = {
      version: 1,
      app: 'GoooG',
      exportedAt: new Date().toISOString(),
      summary: {
        charactersCount: 3,
        labelsCount: 0,
        gameSessionsCount: 0,
        gameAnswersCount: 0,
        data18FavoritesCount: 0,
        data18WatchLaterCount: 0,
      },
      data: {
        labels: [],
        characters: [
          makeChar('Riley Reid', [{ url: 'https://example.com/riley-1.jpg', position: 0 }]),
          makeChar('Mia Malkova', [{ url: 'https://example.com/mia-1.jpg', position: 0 }]),
          // Same name+category as the first entry, with a different, non-overlapping image —
          // should merge into the same row rather than creating a second "Riley Reid".
          makeChar('riley reid', [{ url: 'https://example.com/riley-2.jpg', position: 0 }]),
        ],
        gameSessions: [],
        data18Favorites: [],
        data18WatchLater: [],
      },
    };

    const res = await app.request('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'merge', backup: sampleBackup }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { imported: { characters: number } };
    // Only 2 distinct characters were actually created.
    expect(body.imported.characters).toBe(2);
    expect(state.characters).toHaveLength(2);
    expect(state.characters.map((c) => c.name).sort()).toEqual(['Mia Malkova', 'Riley Reid']);

    const riley = state.characters.find((c) => c.name === 'Riley Reid')!;
    const rileyImages = state.characterImages.filter((ci) => ci.character_id === riley.id);
    expect(rileyImages.map((i) => i.url).sort()).toEqual([
      'https://example.com/riley-1.jpg',
      'https://example.com/riley-2.jpg',
    ]);
    // Both entries exported at position 0 — the second must not have been dropped.
    expect(new Set(rileyImages.map((i) => i.position)).size).toBe(2);
  });

  it('rejects invalid or corrupted backup payloads', async () => {
    const state = fakeDb();
    const app = makeApp(state.db);

    const res = await app.request('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'merge',
        backup: { version: 2, data: {} }, // wrong version
      }),
    });

    expect(res.status).toBe(400);
  });
});

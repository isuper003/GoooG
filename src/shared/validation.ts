import { z } from 'zod';

export const characterImageInputSchema = z.object({
  url: z.string().url(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categoryKey: z.string().trim().min(1, 'Category key is required'),
  labelIds: z.array(z.number().int().positive()).optional(),
  newLabelNames: z.array(z.string().trim().min(1)).optional(),
  images: z.array(characterImageInputSchema).min(1, 'At least 1 image is required').max(6, 'At most 6 images allowed'),
});

export const characterUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  categoryKey: z.string().trim().min(1, 'Category key is required'),
  labelIds: z.array(z.number().int().positive()).optional(),
  newLabelNames: z.array(z.string().trim().min(1)).optional(),
  images: z.array(characterImageInputSchema).min(1, 'At least 1 image is required').max(6, 'At most 6 images allowed'),
});

export const characterActiveSchema = z.object({
  isActive: z.boolean(),
});

export const labelCreateSchema = z.object({
  name: z.string().trim().min(1, 'Label name is required'),
});

export const gameSessionCreateSchema = z
  .object({
    scope: z.enum(['trans', 'sluts', 'twinks', 'mix']).default('mix'),
    mode: z.enum(['classic', 'match']),
    plannedRounds: z.number().int().positive().nullable().optional(),
    characterIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
    preset: z.enum(['due', 'leech', 'critical', 'quick_mix']).optional(),
    padPoolTo: z.number().int().min(2).max(100).optional(),
  })
  .refine((v) => !(v.characterIds && v.preset), {
    message: 'Provide either characterIds or preset, not both',
  });

export const gameAnswerSchema = z.object({
  phase: z.enum(['main', 'remediation']),
  roundIndex: z.number().int().min(0),
  characterId: z.number().int().positive(),
  isCorrect: z.boolean(),
  srsLevelBefore: z.number().int().min(0).max(5),
  srsLevelAfter: z.number().int().min(0).max(5),
  selectedCharacterId: z.number().int().positive().nullable().optional(),
  elapsedMs: z.number().int().min(0).nullable().optional(),
  fluency: z.enum(['lightning', 'fluent', 'hesitant']).nullable().optional(),
  mode: z.enum(['classic', 'match']).optional(),
});

export const gameSessionFinishSchema = z.object({
  totalRoundsPlayed: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  totalWrong: z.number().int().min(0),
  remediationRoundsPlayed: z.number().int().min(0),
});

export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type CharacterUpdateInput = z.infer<typeof characterUpdateSchema>;
export type CharacterActiveInput = z.infer<typeof characterActiveSchema>;
export type LabelCreateInput = z.infer<typeof labelCreateSchema>;
export type GameSessionCreateInput = z.infer<typeof gameSessionCreateSchema>;
export type GameAnswerInput = z.infer<typeof gameAnswerSchema>;
export type GameSessionFinishInput = z.infer<typeof gameSessionFinishSchema>;

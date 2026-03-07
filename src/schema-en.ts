import { z } from "zod/v4";

export const EnKyEntrySchema = z.object({
  id: z.string(),
  en: z.string(),
  ky: z.string(),
  pos: z.enum(["noun", "verb", "adj", "adv", "pron", "post", "num", "conj", "intj"]),
  source: z.enum(["wiktionary-en", "pivot-ru", "manual"]),
  senses: z.array(z.string()).optional(),
  examples: z.array(z.object({ ky: z.string(), en: z.string() })).optional(),
  pronunciation: z.string().optional(),
  etymology: z.string().optional(),
  frequency: z.number().optional(),
  ruPivot: z.string().optional(),
  wiktionaryUrl: z.string().optional(),
});

export type EnKyEntry = z.infer<typeof EnKyEntrySchema>;

export function validateEnKyEntry(data: unknown): z.SafeParseReturnType<unknown, EnKyEntry> {
  return EnKyEntrySchema.safeParse(data);
}

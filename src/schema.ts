import { z } from "zod/v4";

const ExampleSchema = z.object({
  ky: z.string(),
  ru: z.string(),
});

const MorphologySchema = z.object({
  stemType: z.enum(["vowel", "voiced", "voiceless"]),
  vowelGroup: z.literal(1).or(z.literal(2)).or(z.literal(3)).or(z.literal(4)),
  forms: z.record(z.string(), z.string()).optional(),
  pluralForms: z.record(z.string(), z.string()).optional(),
  rule: z.string().optional(),
});

const DerivationSchema = z.object({
  root: z.string().optional(),
  suffix: z.string().optional(),
  explanation: z.string().optional(),
});

export const DictionaryEntrySchema = z.object({
  id: z.string(),
  ru: z.string(),
  ky: z.string(),
  pos: z.enum(["noun", "verb", "adj", "adv", "pron", "post", "num", "conj", "intj"]),
  pronunciation: z.string().optional(),

  // Семантика
  senses: z.array(z.string()).optional(),
  examples: z.array(ExampleSchema).optional(),

  // Морфология
  morphology: MorphologySchema.optional(),

  // Словообразование
  derivation: DerivationSchema.optional(),

  related: z.array(z.string()).optional(),
  etymology: z.string().optional(),
  wiktionaryUrl: z.string().optional(),
  ruAccented: z.string().optional(),
  ruGender: z.enum(["m", "f", "n"]).optional(),
  frequency: z.number().optional(),
  source: z.enum(["wiktionary-en", "wiktionary-ru", "apertium", "gourmet", "manual", "pivot-en"]),
  enPivot: z.string().optional(),
});

export type DictionaryEntry = z.infer<typeof DictionaryEntrySchema>;

export function validateEntry(data: unknown): z.SafeParseReturnType<unknown, DictionaryEntry> {
  return DictionaryEntrySchema.safeParse(data);
}

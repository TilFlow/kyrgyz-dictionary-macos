import { describe, expect, test } from "bun:test";
import { parseLexc, mapContinuationClass } from "./lexc-parser";

describe("mapContinuationClass", () => {
  test("maps noun continuation classes", () => {
    expect(mapContinuationClass("NounRoot")).toBe("noun");
    expect(mapContinuationClass("N1")).toBe("noun");
    expect(mapContinuationClass("N-INFL")).toBe("noun");
    expect(mapContinuationClass("N-INFL-SG")).toBe("noun");
    expect(mapContinuationClass("N-INFL-COMMON")).toBe("noun");
  });

  test("maps verb continuation classes", () => {
    expect(mapContinuationClass("VerbRoot")).toBe("verb");
    expect(mapContinuationClass("V-TV")).toBe("verb");
    expect(mapContinuationClass("V-IV")).toBe("verb");
    expect(mapContinuationClass("V-INFL-TV")).toBe("verb");
    expect(mapContinuationClass("V-INFL-IV")).toBe("verb");
    expect(mapContinuationClass("VAUX-INFL")).toBe("verb");
  });

  test("maps adjective continuation classes", () => {
    expect(mapContinuationClass("AdjRoot")).toBe("adj");
    expect(mapContinuationClass("A1")).toBe("adj");
    expect(mapContinuationClass("A2")).toBe("adj");
    expect(mapContinuationClass("A3")).toBe("adj");
    expect(mapContinuationClass("A4")).toBe("adj");
  });

  test("maps adverb continuation classes", () => {
    expect(mapContinuationClass("Adverb")).toBe("adv");
    expect(mapContinuationClass("ADV")).toBe("adv");
    expect(mapContinuationClass("ADVITG")).toBe("adv");
    expect(mapContinuationClass("ADV-WITH-KI")).toBe("adv");
  });

  test("maps numeral continuation classes", () => {
    expect(mapContinuationClass("NUM-DIGIT")).toBe("num");
  });

  test("maps postposition continuation classes", () => {
    expect(mapContinuationClass("Postposition")).toBe("post");
    expect(mapContinuationClass("POST")).toBe("post");
    expect(mapContinuationClass("POST-DECL")).toBe("post");
  });

  test("maps conjunction continuation classes", () => {
    expect(mapContinuationClass("CC")).toBe("conj");
    expect(mapContinuationClass("CA")).toBe("conj");
    expect(mapContinuationClass("CS")).toBe("conj");
    expect(mapContinuationClass("Conjunction")).toBe("conj");
  });

  test("maps pronoun continuation classes", () => {
    expect(mapContinuationClass("PRON-DEM")).toBe("pron");
    expect(mapContinuationClass("PRON-PERS-EN")).toBe("pron");
  });

  test("maps interjection continuation classes", () => {
    expect(mapContinuationClass("INTERJ")).toBe("intj");
  });

  test("maps postadverb as adv", () => {
    expect(mapContinuationClass("POSTADV")).toBe("adv");
  });

  test("maps copula as verb", () => {
    expect(mapContinuationClass("V-PERS-COP")).toBe("verb");
  });

  test("returns null for unknown classes", () => {
    expect(mapContinuationClass("CLIT")).toBeNull();
    expect(mapContinuationClass("CASES")).toBeNull();
    expect(mapContinuationClass("#")).toBeNull();
  });
});

describe("parseLexc", () => {
  test("parses a simple LEXC entry", () => {
    const content = `LEXICON Nouns
китеп:китеп N-INFL ; ! "book"`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "китеп", pos: "noun" }]);
  });

  test("handles entries with different surface:underlying forms (takes surface as lemma)", () => {
    const content = `LEXICON Adjectives
автономиялуу:автономиялык A4 ; ! "" Dir/LR`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "автономиялуу", pos: "adj" }]);
  });

  test("handles entries without colon separator", () => {
    const content = `LEXICON Verbs
бол V-INFL-IV ; ! "be"`;
    const result = parseLexc(content);
    // Entry without colon: "бол" is both lemma and form
    expect(result).toEqual([{ lemma: "бол", pos: "verb" }]);
  });

  test("ignores comment lines", () => {
    const content = `LEXICON Nouns
! This is a comment
китеп:китеп N-INFL ; ! "book"
! Another comment`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "китеп", pos: "noun" }]);
  });

  test("ignores LEXICON header lines", () => {
    const content = `LEXICON Nouns
китеп:китеп N-INFL ; ! "book"
LEXICON Verbs
бол:бол V-INFL-IV ; ! "be"`;
    const result = parseLexc(content);
    expect(result).toEqual([
      { lemma: "китеп", pos: "noun" },
      { lemma: "бол", pos: "verb" },
    ]);
  });

  test("ignores empty lines", () => {
    const content = `LEXICON Nouns

китеп:китеп N-INFL ; ! "book"

бала:бала N-INFL ; ! "child"
`;
    const result = parseLexc(content);
    expect(result).toEqual([
      { lemma: "китеп", pos: "noun" },
      { lemma: "бала", pos: "noun" },
    ]);
  });

  test("deduplicates by lemma, keeping first POS", () => {
    const content = `LEXICON Nouns
кийин:кийин N-INFL ;
LEXICON Postpositions
кийин:кийин POST ; ! "with"`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "кийин", pos: "noun" }]);
  });

  test("skips entries with morphological tags in lemma", () => {
    const content = `LEXICON Pronouns
мен%<prn%>%<pers%>%<p1%>%<sg%>:м PRON-PERS-EN ;
LEXICON Nouns
китеп:китеп N-INFL ;`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "китеп", pos: "noun" }]);
  });

  test("skips entries whose continuation class has no POS mapping", () => {
    const content = `LEXICON Nouns
китеп:китеп N-INFL ;
LEXICON CLITICS-NO-COP
да:да CLIT ;`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "китеп", pos: "noun" }]);
  });

  test("handles escaped spaces in lemma", () => {
    const content = `LEXICON Verbs
алып% бар:алып% бар V-INFL-TV ; ! "take (somewhere)"`;
    const result = parseLexc(content);
    expect(result).toEqual([{ lemma: "алып бар", pos: "verb" }]);
  });

  test("parses multiple POS sections correctly", () => {
    const content = `LEXICON Nouns
китеп:китеп N-INFL ; ! "book"
бала:бала N-INFL ; ! "child"
LEXICON Adjectives
абсолюттук:абсолюттук A4 ; ! ""
LEXICON Verbs
бол:бол V-INFL-IV ; ! "be"
LEXICON Conjunctions
жана:жана CC ; ! "and"
LEXICON Interjections
ооба:ооба INTERJ ; ! "yes"`;
    const result = parseLexc(content);
    const lemmas = result.map((e) => e.lemma);
    expect(lemmas).toContain("китеп");
    expect(lemmas).toContain("бала");
    expect(lemmas).toContain("абсолюттук");
    expect(lemmas).toContain("бол");
    expect(lemmas).toContain("жана");
    expect(lemmas).toContain("ооба");

    expect(result.find((e) => e.lemma === "китеп")!.pos).toBe("noun");
    expect(result.find((e) => e.lemma === "абсолюттук")!.pos).toBe("adj");
    expect(result.find((e) => e.lemma === "бол")!.pos).toBe("verb");
    expect(result.find((e) => e.lemma === "жана")!.pos).toBe("conj");
    expect(result.find((e) => e.lemma === "ооба")!.pos).toBe("intj");
  });
});

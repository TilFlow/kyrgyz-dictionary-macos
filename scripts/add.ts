import { join } from "node:path";
import { createInterface } from "node:readline";
import type { DictionaryEntry } from "../src/schema";
import { validateEntry } from "../src/schema";
import { enrichEntry } from "../src/morphology";

const ENTRIES_DIR = join(import.meta.dirname, "..", "entries");

const POS_OPTIONS = [
  { value: "noun", label: "noun (сущ.)" },
  { value: "verb", label: "verb (гл.)" },
  { value: "adj", label: "adj (прил.)" },
  { value: "adv", label: "adv (нареч.)" },
  { value: "pron", label: "pron (мест.)" },
  { value: "post", label: "post (послел.)" },
  { value: "num", label: "num (числ.)" },
  { value: "conj", label: "conj (союз)" },
  { value: "intj", label: "intj (межд.)" },
] as const;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  try {
    // 1. Russian word
    const ru = (await ask("Русское слово: ")).trim();
    if (!ru) {
      console.error("Слово не может быть пустым.");
      process.exit(1);
    }

    // 2. Kyrgyz translation
    const ky = (await ask("Кыргызский перевод: ")).trim();
    if (!ky) {
      console.error("Перевод не может быть пустым.");
      process.exit(1);
    }

    // 3. POS
    console.log("\nЧасть речи:");
    for (let i = 0; i < POS_OPTIONS.length; i++) {
      console.log(`  ${i + 1}. ${POS_OPTIONS[i].label}`);
    }
    const posInput = (await ask("Выберите номер: ")).trim();
    const posIndex = parseInt(posInput, 10) - 1;
    if (isNaN(posIndex) || posIndex < 0 || posIndex >= POS_OPTIONS.length) {
      console.error("Неверный номер.");
      process.exit(1);
    }
    const pos = POS_OPTIONS[posIndex].value;

    // 4. Senses
    const sensesInput = (await ask("Значения (через запятую): ")).trim();
    const senses = sensesInput
      ? sensesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    // 5. Determine letter file
    const letter = ru[0].toLowerCase();
    const filePath = join(ENTRIES_DIR, `${letter}.json`);

    // Read existing entries or start with empty array
    let entries: DictionaryEntry[] = [];
    const file = Bun.file(filePath);
    if (await file.exists()) {
      entries = await file.json();
    }

    // Generate ID
    const prefix = `ru-${ru}-`;
    const existingSeqs = entries
      .filter((e) => e.id.startsWith(prefix))
      .map((e) => {
        const seqStr = e.id.slice(prefix.length);
        return parseInt(seqStr, 10);
      })
      .filter((n) => !isNaN(n));
    const nextSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
    const id = `${prefix}${String(nextSeq).padStart(3, "0")}`;

    // Build entry
    let entry: DictionaryEntry = {
      id,
      ru,
      ky,
      pos,
      source: "manual",
      ...(senses && senses.length > 0 ? { senses } : {}),
    };

    // 5b. Enrich nouns with morphology
    entry = enrichEntry(entry);

    // 6. Preview
    console.log("\nПредпросмотр записи:");
    console.log(JSON.stringify(entry, null, 2));

    // 7. Confirm
    const confirm = (await ask("\nДобавить? (y/n): ")).trim().toLowerCase();
    if (confirm !== "y" && confirm !== "да") {
      console.log("Отменено.");
      process.exit(0);
    }

    // 8. Validate
    const result = validateEntry(entry);
    if (!result.success) {
      console.error("Ошибка валидации:");
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        console.error(`  ${path}: ${issue.message}`);
      }
      process.exit(1);
    }

    // 9. Save
    entries.push(entry);
    await Bun.write(filePath, JSON.stringify(entries, null, 2) + "\n");

    console.log(`Добавлено! ID: ${id}`);
  } finally {
    rl.close();
  }
}

main();

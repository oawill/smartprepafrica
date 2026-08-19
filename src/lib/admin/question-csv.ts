/** Quoted-CSV parser for the question bulk-upload wizard. Unlike
 * src/lib/csv.ts's parseSimpleCsv (fine for plain name/email rosters),
 * question text and explanations routinely contain commas and quotes, so
 * this handles RFC4180-style quoting ("..." with "" escapes) and
 * quoted newlines within a field. */
export function parseQuotedCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export const QUESTION_CSV_HEADERS = [
  "exam",
  "subject",
  "topic",
  "subtopic",
  "grade",
  "year",
  "difficulty",
  "prompt",
  "imageUrl",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "correctOption",
  "explanation",
  "sourceType",
] as const;

export function generateQuestionCsvTemplate(): string {
  const header = QUESTION_CSV_HEADERS.join(",");
  const example = [
    "WAEC",
    "Mathematics",
    "Quadratic Equations",
    "",
    "SS3",
    "2023",
    "MEDIUM",
    '"Solve for x: x^2 - 5x + 6 = 0"',
    "",
    "2 or 3",
    "-2 or -3",
    "1 or 6",
    "0 or 5",
    "",
    "A",
    '"Factor as (x-2)(x-3)=0, so x=2 or x=3."',
    "ORIGINAL_SMARTPREP_QUESTION",
  ].join(",");
  return `${header}\n${example}\n`;
}

export type ParsedQuestionRow = {
  rowNumber: number;
  exam: string;
  subjectName: string;
  topic: string;
  subtopic: string;
  grade: string;
  year: string;
  difficulty: string;
  prompt: string;
  imageUrl: string;
  options: { key: string; text: string }[];
  correctOption: string;
  explanation: string;
  sourceType: string;
};

export function rowsToObjects(rows: string[][]): ParsedQuestionRow[] {
  const [header, ...dataRows] = rows;
  const normalizedHeader = header.map((h) => h.trim());
  return dataRows.map((cells, index) => {
    const get = (name: string) => {
      const i = normalizedHeader.indexOf(name);
      return i === -1 ? "" : (cells[i] ?? "").trim();
    };
    const options = ["A", "B", "C", "D", "E"]
      .map((key) => ({ key, text: get(`option${key}`) }))
      .filter((o) => o.text.length > 0);
    return {
      rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
      exam: get("exam").toUpperCase(),
      subjectName: get("subject"),
      topic: get("topic"),
      subtopic: get("subtopic"),
      grade: get("grade"),
      year: get("year"),
      difficulty: get("difficulty").toUpperCase(),
      prompt: get("prompt"),
      imageUrl: get("imageUrl"),
      options,
      correctOption: get("correctOption").toUpperCase(),
      explanation: get("explanation"),
      sourceType: get("sourceType").toUpperCase() || "IMPORTED",
    };
  });
}

const VALID_EXAMS = new Set(["WAEC", "NECO", "UTME", "POST_UTME"]);
const VALID_DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);
const VALID_SOURCE_TYPES = new Set([
  "OFFICIAL_PAST_QUESTION",
  "LICENSED_QUESTION",
  "ORIGINAL_SMARTPREP_QUESTION",
  "TEACHER_CREATED",
  "AI_GENERATED",
  "IMPORTED",
]);

export type RowValidation = {
  rowNumber: number;
  status: "OK" | "WARNING" | "ERROR";
  messages: string[];
};

export function validateRow(
  row: ParsedQuestionRow,
  subjectIdByName: Map<string, string>
): RowValidation {
  const messages: string[] = [];
  let status: "OK" | "WARNING" | "ERROR" = "OK";

  const fail = (msg: string) => {
    messages.push(msg);
    status = "ERROR";
  };
  const warn = (msg: string) => {
    messages.push(msg);
    if (status === "OK") status = "WARNING";
  };

  if (!row.exam) fail("Missing exam.");
  else if (!VALID_EXAMS.has(row.exam)) fail(`Invalid exam "${row.exam}" — must be WAEC, NECO, UTME, or POST_UTME.`);

  if (!row.subjectName) fail("Missing subject.");
  else if (!subjectIdByName.has(row.subjectName.trim().toLowerCase())) {
    fail(`Subject "${row.subjectName}" does not exist. Add it under Subjects & topics first.`);
  }

  if (!row.difficulty) warn("Missing difficulty — will default to MEDIUM.");
  else if (!VALID_DIFFICULTIES.has(row.difficulty)) fail(`Invalid difficulty "${row.difficulty}".`);

  if (row.sourceType && !VALID_SOURCE_TYPES.has(row.sourceType)) {
    fail(`Invalid source type "${row.sourceType}".`);
  }

  if (!row.prompt) fail("Missing question text.");

  if (row.year) {
    const year = Number(row.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1980 || year > currentYear + 1) {
      fail(`Invalid year "${row.year}".`);
    }
  }

  if (row.options.length < 2) {
    fail("At least two answer options are required.");
  }

  if (!row.correctOption) {
    fail("Missing correct answer.");
  } else if (!row.options.some((o) => o.key === row.correctOption)) {
    fail(`Correct answer "${row.correctOption}" does not match any provided option.`);
  }

  if (!row.topic) warn("Missing topic.");

  const formulaText = `${row.prompt} ${row.explanation}`;
  const dollarCount = (formulaText.match(/\$/g) ?? []).length;
  if (dollarCount % 2 !== 0) {
    warn("Possibly broken LaTeX — odd number of $ delimiters.");
  }

  if (row.imageUrl && !/^https?:\/\//i.test(row.imageUrl)) {
    warn(`Image URL "${row.imageUrl}" does not look like a valid http(s) URL.`);
  }

  if (messages.length === 0) messages.push("Looks good.");

  return { rowNumber: row.rowNumber, status, messages };
}

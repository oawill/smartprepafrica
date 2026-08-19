export type QuestionOption = {
  key: string;
  text: string;
};

export function asOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value as QuestionOption[];
}

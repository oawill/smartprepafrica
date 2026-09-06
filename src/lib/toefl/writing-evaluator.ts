export type WritingEvaluationResult = {
  estimatedScore: number;
  organization: number;
  grammar: number;
  vocabulary: number;
  clarity: number;
  taskCompletion: number;
  feedback: string;
};

export interface WritingEvaluator {
  evaluateWritingResponse(opts: {
    promptText: string;
    responseText: string;
    wordCount: number;
  }): Promise<WritingEvaluationResult>;
}

export function isWritingEvaluationConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

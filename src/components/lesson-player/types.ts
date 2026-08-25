export type PlayerChapter = {
  id: string;
  order: number;
  title: string;
  startSeconds: number;
  endSeconds: number | null;
  transcriptSegment: string | null;
};

/** Deliberately no correctOption here — the client never receives the
 * answer key before the student answers. The server grades and returns
 * correctOption/explanation only after a real submission. */
export type PlayerCheckpoint = {
  id: string;
  atSeconds: number;
  prompt: string;
  options: { key: string; text: string }[];
  chapterId: string | null;
};

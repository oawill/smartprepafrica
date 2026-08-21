export type BulkResult = {
  updatedCount: number;
  failed: { id: string; reason: string }[];
};

export type BulkAction = {
  key: string;
  label: string;
  danger?: boolean;
  needsReason?: boolean;
  confirmMessage: (count: number) => string;
  run: (ids: string[], reason?: string) => Promise<BulkResult>;
};

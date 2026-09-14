// Phase 5 §2/§35 — a clean seam for future automated discovery sources
// (search APIs, grant databases, foundation databases, approved AI
// research services). Nothing in this codebase calls `.discover()` on
// anything yet — every EducationAccessGrantDiscovery row this pass is
// created by an admin through the manual intake form. This interface
// exists so a future phase can plug in a real provider without touching
// the discovery record shape or the review/scoring/import workflow.
import type { DiscoverySourceType } from "@prisma/client";

export type NormalizedDiscoveryRecord = {
  sourceName: string;
  sourceType: DiscoverySourceType;
  sourceUrl: string;
  externalId?: string;
  funderName: string;
  opportunityName: string;
  opportunityUrl?: string;
  description?: string;
  fundingFocus?: string;
  fundingCategories?: string[];
  geographicFocus?: string;
  minimumAwardMinor?: number;
  maximumAwardMinor?: number;
  currency?: string;
  deadline?: Date;
  rollingDeadline?: boolean;
  eligibilitySummary?: string;
};

export interface GrantDiscoveryProvider {
  name: string;
  sourceType: DiscoverySourceType;
  // AI guardrail (brief §36): a provider may summarize/classify/extract,
  // but must never fabricate a funder, opportunity, deadline, contact, or
  // amount. Every returned record must trace back to a real source URL.
  discover(query: string): Promise<NormalizedDiscoveryRecord[]>;
}

// The only provider implemented this pass. Deliberately a no-op — manual
// entry happens through the admin form directly against the database,
// not through this interface, since there is nothing to "discover"
// automatically yet.
export const manualEntryProvider: GrantDiscoveryProvider = {
  name: "Manual Entry",
  sourceType: "MANUAL_URL",
  async discover(): Promise<NormalizedDiscoveryRecord[]> {
    return [];
  },
};

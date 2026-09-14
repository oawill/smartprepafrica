import { getPlatformSettings } from "@/lib/legal/settings";

const noteFields = [
  { key: "orgLeadershipNote", label: "Leadership" },
  { key: "orgRegistrationNote", label: "Registration" },
  { key: "orgMissionNote", label: "Mission" },
  { key: "orgGovernanceNote", label: "Program Governance" },
  { key: "orgDataPrivacyNote", label: "Data Privacy" },
  { key: "orgSafeguardingNote", label: "Student Safeguarding" },
  { key: "orgFinancialNote", label: "Financial Information" },
] as const;

// Reusable organizational-credibility block for /proposal and
// /due-diligence. Only ever shows the legal entity name plus whichever
// admin-provided notes are actually populated — never a nonprofit/
// charity/501(c)(3) claim, since no such field or status exists today.
export async function OrganizationalInfo() {
  const settings = await getPlatformSettings();
  const legalName = settings.companyLegalName || "Cicerah Technologies Limited";
  const populatedNotes = noteFields.filter((field) => settings[field.key]);

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">
        SmartPrepAfrica is operated by <strong className="text-text-primary">{legalName}</strong>, a
        private company — not a registered nonprofit, charity, or 501(c)(3) organization.
      </p>
      {populatedNotes.map((field) => (
        <div key={field.key}>
          <p className="font-semibold text-text-primary">{field.label}</p>
          <p className="mt-1 text-sm text-text-secondary">{settings[field.key]}</p>
        </div>
      ))}
    </div>
  );
}

# Phase 5 Implementation Assessment — Multi-Sided Account System

Date: 2026-08-26
Status: Pre-implementation architecture review (Stage A), per Phase 5 brief §1.

## Headline finding

The Phase 5 brief was written as if this were a largely greenfield build. **It is not.**
A full-repo audit (auth, schema, all seven dashboards, partner/payment/admin systems)
found that almost every role, linking mechanism, and dashboard the brief asks for
**already exists and is functional**:

| Brief asks for | Reality |
|---|---|
| Student/Parent/Teacher/School/Sponsor/Partner/Admin roles | All 7 already in `Role`/`AdminRole` enums, all with working dashboards |
| Parent↔Student linking model | `ParentStudentLink` already exists (parent, student, `@@unique`) |
| Sponsorship system | `SponsorProfile` → `SponsorshipProgram` → `Voucher` → `VoucherRedemption` already exists, fully wired to a real dashboard |
| Partner referral/commission funnel | `Partner`, `PartnerReferral`, `PartnerCommissionRule`, `PartnerCommission`, `PartnerPayout`, `PartnerSchoolAttribution`, `PartnerFraudFlag` — a mature, server-side-attributed system, not cookie-only |
| Admin RBAC/permissions | Already granular: `AdminRole` enum + `Permission` union + `ROLE_PERMISSIONS` map + `requireAdminPage(Permission)`/`requireActionPermission(Permission)` helpers, not just `role === ADMIN` |
| Audit logging | `AuditLog` (general) + `PartnerAuditLog` (partner-scoped) already exist and are already written to on permission denials and several admin actions |
| School→Teacher→Student structure | `School`, `TeacherProfile`, `Class` (cohort), `StudentProfile.classId` all exist and are wired into working school/teacher dashboards |
| Course creation, modules, lessons, assignments, live classes | All exist as models + working (if single-form, not wizard) creation flows |

**Implication**: Phase 5 is a *hardening and gap-filling* pass on top of a working system,
not a "build the multi-sided account system" project. Treating it as the latter would
mean re-deriving working code, which directly violates the brief's own rule #29
("Do not rebuild... Do not duplicate existing models").

## What genuinely does NOT exist yet (real gaps)

These are the only areas where Phase 5 should add new structure:

1. **No shared non-admin authorization helper.** `src/lib/admin/authz.ts` is a real,
   reusable RBAC helper — but it's scoped to `AdminRole`/`Permission` only. Every other
   role (school/teacher/parent/sponsor/partner) hand-rolls its own private
   `assertSchoolAdmin`/`assertApprovedPartner`-style guard function, duplicated per
   file, with no shared `Permission` vocabulary. This is the RBAC brief section (§14)
   asks for and is a legitimate, scoped piece of work.

2. **No school-side invitation system.** Today "adding" a teacher/student to a school
   is `addTeacherByEmail`/`addStudentByEmail` — it only works if the person already
   has an account, with no token, no accept/decline, no expiry. The brief's §8
   (secure invitation tokens) is a real, missing feature. (There *is* an existing,
   unrelated invitation-token pattern to reuse the shape of:
   `PartnerSchoolLead.invitationToken` for partner→school acquisition leads.)

3. **No Course↔Class(cohort) link.** `Class` (cohort) and `Course` have zero relation
   today — a cohort is purely a roster for analytics, not something you can assign
   coursework to. Brief §9 ("assign courses/practice/mocks to a cohort") requires a
   new join, not a new top-level model.

4. **No general-purpose Notification model.** Only `PartnerNotification` exists,
   deliberately partner-scoped. Brief §17 needs a new generic model, following the
   same "general + scoped satellite" pattern already established by
   `AuditLog`/`PartnerAuditLog`.

5. **No parent-initiated linking flow.** `ParentStudentLink` exists as a model and
   `dashboard/parent` can already read it, but the actual "student generates a code,
   parent enters it, student approves" workflow (brief §4) doesn't exist yet — today
   a link row's creation path needs to be confirmed/built (existing `linkChild` action
   found on the parent dashboard needs inspection to see whether it does immediate
   linking or needs a request/approve step retrofitted — status handling
   (`PENDING/ACTIVE/REJECTED/REMOVED`) does not currently exist on `ParentStudentLink`,
   which has no `status` field at all today).

6. **No course creation wizard.** Course authoring is one flat form plus incremental
   add-forms on a single scrolling page — not the 6-step wizard in brief §6.
   Given rule #29 ("do not rebuild working functionality"), the right move is a
   thin step-UI wrapper around the *existing* create actions, not new mutation logic.

7. **No edit/delete for course/module/lesson/assignment** — teacher-side authoring is
   create-only today. Out of explicit scope in the brief, but worth flagging as a
   pre-existing gap that Phase 5 dashboard work will make more visible.

8. **No teacher earnings view, no attendance tracking, no school billing UI** — models
   partially exist (`Payment`, `Subscription`) but aren't surfaced on
   teacher/school dashboards yet.

## Recommended scope adjustment

Given the above, I'm proposing the Phase 5 implementation plan focus on:

- **Stage A (this document)** — done.
- **Stage B** — Parent↔Student linking workflow (add `status` to `ParentStudentLink`,
  build code-generate/approve flow) — the one place a real model gap exists.
- **Stage C/D** — a shared non-admin RBAC helper (generalizing the admin
  `Permission`/`requireActionPermission` pattern to all roles), applied incrementally
  to school/teacher/sponsor/partner actions as they're touched — not a big-bang rewrite
  of every existing action.
- **School invitations** (real token-based flow, reusing the `PartnerSchoolLead`
  token pattern) — genuine new feature.
- **Class↔Course join** for cohort assignment — genuine new, small feature.
- **Generic `Notification` model** + minimal delivery surface (in-app only, no
  email/push infra per "avoid unnecessary infrastructure").
- Dashboard **enhancements** (My Learning Circle section, parent "needs
  attention"/"strongest" framing, sponsor aggregate cards, etc.) layered onto the
  *existing* dashboard pages, not new dashboard shells.
- Course wizard as a thin UI layer over existing actions.
- Defer/scale down: full multi-role "Switch Workspace" UI (schema already supports a
  user having e.g. both `SponsorProfile` and being `role=SPONSOR`, but the `Role` enum
  is single-value per user — true multi-role switching would require a real schema
  change the brief itself says to avoid unless "existing architecture safely supports"
  it; recommend deferring to Phase 5.1 per the brief's own §15 escape hatch).

Full staged breakdown, exact schema diffs, and file-level task list to follow in the
implementation plan once scope above is confirmed.

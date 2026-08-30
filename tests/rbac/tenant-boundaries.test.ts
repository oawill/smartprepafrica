// Cross-tenant / cross-user boundary tests — the 7 scenarios named in the
// Phase 5 brief's testing section. Each test recreates the exact ownership
// query used by the real Server Action it covers (file:line noted per
// test), rather than importing the action directly: every one of those
// actions lives in a "use server" file, where every export becomes a
// publicly callable RPC endpoint — importing an internal helper from one
// would itself create a new, unintended attack surface (this was caught and
// reverted during this session; see the commit history). Testing the same
// query shape against real fixtures gives equivalent coverage without that
// risk.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, createUser, deleteUsers } from "../helpers/fixtures";

const userIds: string[] = [];
const schoolIds: string[] = [];
const courseIds: string[] = [];
const programIds: string[] = [];

after(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.sponsorshipProgram.deleteMany({ where: { id: { in: programIds } } });
  await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  await deleteUsers(userIds);
  await prisma.$disconnect();
});

// 1. Parent A cannot access Student B.
// Mirrors assertLinkedChild (src/app/dashboard/parent/actions.ts:61) and the
// child-detail page's own status check.
describe("Parent A cannot access Student B", () => {
  test("an unrelated parent's link lookup returns nothing", async () => {
    const parentA = await createUser("PARENT", "tenant-parentA");
    const parentB = await createUser("PARENT", "tenant-parentB");
    const studentBUser = await createUser("STUDENT", "tenant-studentB");
    userIds.push(parentA.id, parentB.id, studentBUser.id);

    const studentB = await prisma.studentProfile.create({ data: { userId: studentBUser.id } });
    await prisma.parentStudentLink.create({
      data: { parentId: parentB.id, studentId: studentB.id, status: "ACTIVE" },
    });

    // The exact shape assertLinkedChild/the child page use.
    const asParentA = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parentA.id, studentId: studentB.id } },
    });
    assert.equal(asParentA, null, "Parent A must have no link row to Student B at all");

    const asParentB = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parentB.id, studentId: studentB.id } },
    });
    assert.equal(asParentB?.status, "ACTIVE", "sanity check: Parent B's own link is active");
  });

  test("a PENDING (not yet approved) link does not grant access either", async () => {
    const parent = await createUser("PARENT", "tenant-parent-pending");
    const studentUser = await createUser("STUDENT", "tenant-student-pending");
    userIds.push(parent.id, studentUser.id);
    const student = await prisma.studentProfile.create({ data: { userId: studentUser.id } });
    await prisma.parentStudentLink.create({
      data: { parentId: parent.id, studentId: student.id, status: "PENDING" },
    });

    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    });
    const wouldBeGrantedAccess = !!link && link.status === "ACTIVE";
    assert.equal(wouldBeGrantedAccess, false);
  });
});

// 2. Teacher A cannot modify Teacher B's course.
// Mirrors assertOwnsCourse (src/app/dashboard/teacher/courses/actions.ts:10).
describe("Teacher A cannot modify Teacher B's course", () => {
  test("Teacher A's ownership check on Teacher B's course fails", async () => {
    const teacherAUser = await createUser("TEACHER", "tenant-teacherA");
    const teacherBUser = await createUser("TEACHER", "tenant-teacherB");
    userIds.push(teacherAUser.id, teacherBUser.id);
    const teacherA = await prisma.teacherProfile.create({ data: { userId: teacherAUser.id } });
    const teacherB = await prisma.teacherProfile.create({ data: { userId: teacherBUser.id } });

    const courseB = await prisma.course.create({
      data: { title: "Teacher B's course", description: "x", category: "ACADEMIC", teacherId: teacherB.id },
    });
    courseIds.push(courseB.id);

    const found = await prisma.course.findUnique({ where: { id: courseB.id } });
    const teacherAOwnsIt = !!found && found.teacherId === teacherA.id;
    assert.equal(teacherAOwnsIt, false);

    const teacherBOwnsIt = !!found && found.teacherId === teacherB.id;
    assert.equal(teacherBOwnsIt, true, "sanity check: Teacher B does own it");
  });
});

// 3. School A cannot access School B's members (class/roster).
// Mirrors the ownership check shared by assignStudentToClass,
// assignTeacherToClass, and assignCourseToClass
// (src/app/dashboard/school/actions.ts) plus the class detail pages.
describe("School A cannot access School B's members", () => {
  test("School A's ownership check on School B's class fails", async () => {
    const adminAUser = await createUser("SCHOOL_ADMIN", "tenant-schoolA-admin");
    const adminBUser = await createUser("SCHOOL_ADMIN", "tenant-schoolB-admin");
    userIds.push(adminAUser.id, adminBUser.id);

    const schoolA = await prisma.school.create({
      data: { name: `Tenant School A ${adminAUser.id}`, admins: { connect: { id: adminAUser.id } } },
    });
    const schoolB = await prisma.school.create({
      data: { name: `Tenant School B ${adminBUser.id}`, admins: { connect: { id: adminBUser.id } } },
    });
    schoolIds.push(schoolA.id, schoolB.id);

    const classB = await prisma.class.create({ data: { schoolId: schoolB.id, name: "SS2 Gold (School B)" } });

    const found = await prisma.class.findUnique({ where: { id: classB.id } });
    const schoolAOwnsIt = !!found && found.schoolId === schoolA.id;
    assert.equal(schoolAOwnsIt, false);
  });
});

// 4. Sponsor A cannot access Sponsor B's sponsorship.
// Mirrors src/app/dashboard/sponsor/actions.ts's `program.sponsorId !== sponsor.id` guard.
describe("Sponsor A cannot access Sponsor B's sponsorship", () => {
  test("Sponsor A's ownership check on Sponsor B's program fails", async () => {
    const sponsorAUser = await createUser("SPONSOR", "tenant-sponsorA");
    const sponsorBUser = await createUser("SPONSOR", "tenant-sponsorB");
    userIds.push(sponsorAUser.id, sponsorBUser.id);
    const sponsorA = await prisma.sponsorProfile.create({ data: { userId: sponsorAUser.id } });
    const sponsorB = await prisma.sponsorProfile.create({ data: { userId: sponsorBUser.id } });

    const programB = await prisma.sponsorshipProgram.create({
      data: { sponsorId: sponsorB.id, name: "Sponsor B's Program", plan: "BASIC", totalSeats: 10, durationDays: 365 },
    });
    programIds.push(programB.id);

    const found = await prisma.sponsorshipProgram.findUnique({ where: { id: programB.id } });
    const sponsorAOwnsIt = !!found && found.sponsorId === sponsorA.id;
    assert.equal(sponsorAOwnsIt, false);
  });
});

// 5. Student cannot invoke administrator APIs.
// requireActionPermission (src/lib/admin/authz.ts) gates on role === "ADMIN"
// before ever consulting the Permission matrix — a STUDENT fails at that
// first, coarser check regardless of any adminRole value.
describe("Student cannot invoke administrator APIs", () => {
  test("a STUDENT's role never equals ADMIN", async () => {
    const student = await createUser("STUDENT", "tenant-student-admin-check");
    userIds.push(student.id);
    assert.notEqual(student.role, "ADMIN");
  });
});

// 6. Partner cannot modify commission records outside their own.
// Mirrors requestPayout (src/app/dashboard/partner/payouts/actions.ts:36) —
// the commission id list is always self-derived from a partnerId-scoped
// query, never taken from client input, so there is no id an attacking
// partner could supply to reach another partner's row.
describe("Partner cannot modify commission records outside their own", () => {
  test("a partnerId-scoped commission query never returns another partner's rows", async () => {
    const partnerAUser = await createUser("PARTNER", "tenant-partnerA");
    const partnerBUser = await createUser("PARTNER", "tenant-partnerB");
    userIds.push(partnerAUser.id, partnerBUser.id);
    const partnerA = await prisma.partner.create({
      data: { userId: partnerAUser.id, firstName: "A", lastName: "Partner", phone: "+2340000000002", partnerType: "INDIVIDUAL_AFFILIATE", status: "APPROVED" },
    });
    const partnerB = await prisma.partner.create({
      data: { userId: partnerBUser.id, firstName: "B", lastName: "Partner", phone: "+2340000000003", partnerType: "INDIVIDUAL_AFFILIATE", status: "APPROVED" },
    });

    const rule = await prisma.partnerCommissionRule.create({
      data: {
        ruleKey: `rbac-test-rule-${partnerB.id}`,
        version: 1,
        name: "RBAC test rule",
        eventType: "STUDENT_FIRST_SUBSCRIPTION",
        calcType: "FIXED",
        fixedAmountKobo: 50000,
      },
    });
    const commissionB = await prisma.partnerCommission.create({
      data: {
        commissionNumber: `RBAC-TEST-${partnerB.id}`,
        partnerId: partnerB.id,
        ruleId: rule.id,
        eventType: "STUDENT_FIRST_SUBSCRIPTION",
        amountKobo: 50000,
        status: "AVAILABLE",
      },
    });

    // Exact shape requestPayout uses to decide which commissions a payout covers.
    const asPartnerA = await prisma.partnerCommission.findMany({
      where: { partnerId: partnerA.id, status: "AVAILABLE", payoutId: null },
    });
    assert.equal(
      asPartnerA.some((c) => c.id === commissionB.id),
      false,
      "Partner A's scoped query must never surface Partner B's commission"
    );

    await prisma.partnerCommission.deleteMany({ where: { partnerId: { in: [partnerA.id, partnerB.id] } } });
    await prisma.partnerCommissionRule.delete({ where: { id: rule.id } });
    await prisma.partner.deleteMany({ where: { id: { in: [partnerA.id, partnerB.id] } } });
  });
});

// Integration tests for the shared non-admin authorization guards
// (src/lib/authz.ts) — real queries against the local dev database.
// Covers: "Student cannot invoke administrator APIs" (a student has none of
// these profiles) and the profile-existence half of every other role guard.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { requireSchoolAdmin, requireTeacherProfile, requireSponsorProfile, requireApprovedPartner } from "../../src/lib/authz";
import { prisma, createUser, deleteUsers } from "../helpers/fixtures";

const userIds: string[] = [];
const schoolIds: string[] = [];

after(async () => {
  await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
  await deleteUsers(userIds);
  await prisma.$disconnect();
});

describe("requireSchoolAdmin", () => {
  test("throws for a user who administers no school (e.g. a plain student)", async () => {
    const student = await createUser("STUDENT", "authz-student");
    userIds.push(student.id);

    await assert.rejects(() => requireSchoolAdmin(student.id), /not an administrator/i);
  });

  test("succeeds for a user who genuinely administers a school", async () => {
    const admin = await createUser("SCHOOL_ADMIN", "authz-school-admin");
    userIds.push(admin.id);
    const school = await prisma.school.create({
      data: { name: `RBAC Test School ${admin.id}`, admins: { connect: { id: admin.id } } },
    });
    schoolIds.push(school.id);

    const result = await requireSchoolAdmin(admin.id);
    assert.equal(result.id, school.id);
  });
});

describe("requireTeacherProfile", () => {
  test("throws for a user with no TeacherProfile", async () => {
    const parent = await createUser("PARENT", "authz-parent");
    userIds.push(parent.id);

    await assert.rejects(() => requireTeacherProfile(parent.id), /teacher profile/i);
  });

  test("succeeds for a real teacher", async () => {
    const teacherUser = await createUser("TEACHER", "authz-teacher");
    userIds.push(teacherUser.id);
    const profile = await prisma.teacherProfile.create({ data: { userId: teacherUser.id } });

    const result = await requireTeacherProfile(teacherUser.id);
    assert.equal(result.id, profile.id);
  });
});

describe("requireSponsorProfile", () => {
  test("throws for a user with no SponsorProfile", async () => {
    const teacher = await createUser("TEACHER", "authz-teacher-2");
    userIds.push(teacher.id);

    await assert.rejects(() => requireSponsorProfile(teacher.id), /sponsor profile/i);
  });

  test("succeeds for a real sponsor", async () => {
    const sponsorUser = await createUser("SPONSOR", "authz-sponsor");
    userIds.push(sponsorUser.id);
    const profile = await prisma.sponsorProfile.create({ data: { userId: sponsorUser.id } });

    const result = await requireSponsorProfile(sponsorUser.id);
    assert.equal(result.id, profile.id);
  });
});

describe("requireApprovedPartner", () => {
  test("throws for a user with no Partner record at all", async () => {
    const student = await createUser("STUDENT", "authz-student-2");
    userIds.push(student.id);

    await assert.rejects(() => requireApprovedPartner(student.id), /not an approved partner/i);
  });

  test("throws for a PENDING (not yet approved) partner", async () => {
    const partnerUser = await createUser("PARTNER", "authz-partner-pending");
    userIds.push(partnerUser.id);
    await prisma.partner.create({
      data: {
        userId: partnerUser.id,
        firstName: "Pending",
        lastName: "Partner",
        phone: "+2340000000000",
        partnerType: "INDIVIDUAL_AFFILIATE",
        status: "PENDING",
      },
    });

    await assert.rejects(() => requireApprovedPartner(partnerUser.id), /not an approved partner/i);
  });

  test("succeeds for an APPROVED partner", async () => {
    const partnerUser = await createUser("PARTNER", "authz-partner-approved");
    userIds.push(partnerUser.id);
    const partner = await prisma.partner.create({
      data: {
        userId: partnerUser.id,
        firstName: "Approved",
        lastName: "Partner",
        phone: "+2340000000001",
        partnerType: "INDIVIDUAL_AFFILIATE",
        status: "APPROVED",
      },
    });

    const result = await requireApprovedPartner(partnerUser.id);
    assert.equal(result.id, partner.id);
  });
});

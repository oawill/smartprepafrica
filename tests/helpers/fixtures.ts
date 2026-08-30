// Shared test-fixture helpers for the RBAC boundary suite. Creates real rows
// against the local dev database (same DATABASE_URL resolution Prisma
// already uses everywhere else in this project — no test-specific config).
// Every fixture is tagged with a run-unique suffix and torn down by the
// caller in `after()`, so repeated runs never accumulate cruft.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createUser(role: "STUDENT" | "PARENT" | "TEACHER" | "SPONSOR" | "SCHOOL_ADMIN" | "PARTNER" | "ADMIN", label: string) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: `rbac-test-${label}-${suffix}@example.invalid`,
      name: `RBAC Test ${label}`,
      passwordHash: "test-hash-not-used-for-login",
      role,
    },
  });
}

export async function deleteUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  // Cascades to profiles/links via onDelete: Cascade in the schema.
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

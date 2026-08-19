import type { AdminRole, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      adminRole: AdminRole | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    adminRole?: AdminRole | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    adminRole: AdminRole | null;
    sessionVersion: number;
  }
}

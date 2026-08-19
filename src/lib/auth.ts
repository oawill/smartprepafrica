import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { AdminRole, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logLoginActivity } from "@/lib/admin/login-activity";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const userAgent = request?.headers?.get("user-agent") ?? null;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          await logLoginActivity({ email, success: false, failureReason: "NO_ACCOUNT", ip, userAgent });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await logLoginActivity({
            userId: user.id,
            email,
            success: false,
            failureReason: "BAD_PASSWORD",
            ip,
            userAgent,
          });
          return null;
        }

        if (user.status !== "ACTIVE") {
          await logLoginActivity({
            userId: user.id,
            email,
            success: false,
            failureReason: `ACCOUNT_${user.status}`,
            ip,
            userAgent,
          });
          return null;
        }

        await logLoginActivity({ userId: user.id, email, success: true, ip, userAgent });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          adminRole: user.adminRole,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.adminRole = (user.adminRole as AdminRole | null) ?? null;
        token.sessionVersion = user.sessionVersion ?? 0;
        return token;
      }

      // Revalidated on every subsequent request: if the account was
      // suspended/locked/closed, or a Security Admin bumped
      // sessionVersion to force sign-out on this device, invalidate the
      // token immediately instead of waiting for it to expire.
      if (!token.sub) return token;
      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { status: true, sessionVersion: true, adminRole: true },
      });
      if (!current || current.status !== "ACTIVE" || current.sessionVersion !== token.sessionVersion) {
        return null;
      }
      token.adminRole = current.adminRole ?? null;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
        session.user.adminRole = (token.adminRole as AdminRole | null) ?? null;
      }
      return session;
    },
  },
});

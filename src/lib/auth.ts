import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { AdminRole, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logLoginActivity } from "@/lib/admin/login-activity";
import { verifyOtp, consumeOtpForPhone } from "@/lib/phone-otp";
import { hashIp } from "@/lib/partners/attribution";
import { createStudentAccount } from "@/lib/registration/create-student-account";
import { resolveRegistrationCountry } from "@/lib/registration/resolve-country";

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
    // Student-only phone+OTP door (see docs/migration-plan.md Revised
    // Phase 3, Door 1). One provider handles both login (an existing
    // phone) and first-time registration (name/email/agreeToTerms
    // present) — see the comment below on why registration fields are
    // required, not optional, for account creation.
    Credentials({
      id: "phone-otp",
      name: "Phone",
      credentials: {
        phone: { label: "Phone" },
        code: { label: "Code" },
        name: { label: "Name" },
        email: { label: "Email" },
        agreeToTerms: { label: "Agree to terms" },
        ref: { label: "Referral code" },
        campaign: { label: "Campaign" },
        clickToken: { label: "Click token" },
        countryCode: { label: "Country code" },
      },
      authorize: async (credentials, request) => {
        const phone = credentials?.phone as string | undefined;
        const code = credentials?.code as string | undefined;
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const userAgent = request?.headers?.get("user-agent") ?? null;

        if (!phone || !code) return null;

        const result = await verifyOtp(phone, code);
        if (result !== "VALID") return null;

        const existing = await prisma.user.findUnique({ where: { phone } });

        if (existing) {
          await consumeOtpForPhone(phone);
          if (existing.status !== "ACTIVE") {
            await logLoginActivity({
              userId: existing.id,
              email: existing.email,
              success: false,
              failureReason: `ACCOUNT_${existing.status}`,
              ip,
              userAgent,
            });
            return null;
          }
          await logLoginActivity({ userId: existing.id, email: existing.email, success: true, ip, userAgent });
          return {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            role: existing.role,
            adminRole: existing.adminRole,
            sessionVersion: existing.sessionVersion,
          };
        }

        // No account for this phone yet — only create one when this came
        // from the registration form (name/email/agreeToTerms all
        // present). A bare {phone, code} from the /login phone form for
        // an unregistered phone must return null, never silently sign
        // someone up.
        const name = credentials?.name as string | undefined;
        const email = credentials?.email as string | undefined;
        const agreeToTerms = credentials?.agreeToTerms === "true";
        if (!name || !email || !agreeToTerms) return null;

        // Same email-uniqueness check /api/register makes explicitly
        // (route.ts) before ever attempting the create, so a taken email
        // fails cleanly here too instead of surfacing as an unhandled
        // Prisma unique-constraint error from inside authorize().
        const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (emailTaken) return null;

        await consumeOtpForPhone(phone);
        const country = await resolveRegistrationCountry(credentials?.countryCode as string | undefined);
        const ipHash = hashIp(ip);
        const user = await prisma.$transaction((tx) =>
          createStudentAccount(tx, {
            name,
            email,
            phone,
            countryId: country?.id,
            refCode: (credentials?.ref as string | undefined) ?? null,
            campaignSlug: (credentials?.campaign as string | undefined) ?? null,
            clickToken: (credentials?.clickToken as string | undefined) ?? null,
            ipHash,
            userAgent,
          })
        );
        await logLoginActivity({ userId: user.id, email: user.email, success: true, ip, userAgent });
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
        select: { status: true, sessionVersion: true, adminRole: true, role: true },
      });
      if (!current || current.status !== "ACTIVE" || current.sessionVersion !== token.sessionVersion) {
        return null;
      }
      token.adminRole = current.adminRole ?? null;
      // Refreshed (not just set once at login) so switchActiveRole takes
      // effect on the very next request instead of requiring a full
      // re-login — role has never been mutated post-login before this
      // feature existed, so this line was previously a no-op.
      token.role = current.role;
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

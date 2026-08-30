import { prisma } from "@/lib/prisma";
import RegisterForm from "@/app/(auth)/register/register-form";

export default async function RegisterPage() {
  const countries = await prisma.country.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { code: true, name: true, flag: true },
  });

  return <RegisterForm countries={countries} />;
}

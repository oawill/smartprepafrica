import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about SmartPrepAfrica.com — Nigeria's exam-prep and learning platform.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold">About SmartPrepAfrica.com</h1>
          <p className="mt-4 text-slate-400">
            SmartPrepAfrica.com is a learning ecosystem built for Nigerian students, schools, and
            educators. We help students master WAEC, NECO, UTME, and Post-UTME with an
            AI-assisted study coach, practice questions, and mock exams. Beyond exam prep, our
            course marketplace connects learners to courses from independent schools, teachers,
            and organizations across Nigeria — covering academics, career development,
            technology, and life skills.
          </p>
          <p className="mt-4 text-slate-400">
            Our goal is simple: help students prepare smarter, learn from great educators
            wherever they are, and build the skills that carry them beyond the exam.
          </p>
          <p className="mt-8 text-sm text-slate-500">
            Have a question we haven&apos;t answered here?{" "}
            <Link href="/contact" className="text-orange-400 hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

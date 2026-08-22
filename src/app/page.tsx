import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { HeroCarousel } from "@/components/home/hero-carousel";

const exams = [
  { code: "WAEC", desc: "West African Senior School Certificate Examination" },
  { code: "NECO", desc: "National Examinations Council" },
  { code: "UTME", desc: "Unified Tertiary Matriculation Examination" },
  { code: "Post-UTME", desc: "Post-UTME screening for your target institution" },
];

const discoveryStates = ["Lagos", "Rivers", "Kano", "FCT", "Oyo", "Enugu"];
const discoverySubjects = ["Mathematics", "English Language", "Physics", "Chemistry", "Biology"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            180,000+ students preparing with SmartPrepAfrica.com
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Prepare smarter. Pass better.{" "}
            <span className="text-green-400">Achieve more.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            SmartPrepAfrica.com helps Nigerian students master WAEC, NECO, UTME
            and Post-UTME with an AI study coach, plus a course marketplace for
            the skills and career readiness that come after the exam.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Start preparing free
            </Link>
            <Link
              href="/educom"
              className="rounded-full border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Explore Courses
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <HeroCarousel />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-2xl font-semibold">
            All major exams, one place.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exams.map((exam) => (
              <div
                key={exam.code}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="font-semibold text-orange-400">{exam.code}</p>
                <p className="mt-2 text-sm text-slate-400">{exam.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="text-xs font-medium text-green-400">Courses</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold">
              Learn From Great Schools.{" "}
              <span className="text-green-400">Wherever You Are.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Your school shouldn&apos;t limit who you can learn from.
              Discover classes from outstanding schools and teachers across
              Nigeria — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/educom/schools"
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Explore Schools
              </Link>
              <Link
                href="/educom"
                className="rounded-full border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
              >
                Browse Courses
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <Link href="/register" className="hover:text-slate-300">
                Teach on SmartPrepAfrica.com →
              </Link>
              <Link href="/register" className="hover:text-slate-300">
                Sponsor a Student →
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-center text-sm font-medium text-slate-300">
              Explore learning across Nigeria
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">By state</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoveryStates.map((state) => (
                    <Link
                      key={state}
                      href={`/educom/schools?state=${encodeURIComponent(state)}`}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-orange-500 hover:text-orange-300"
                    >
                      {state}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">By subject</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discoverySubjects.map((subject) => (
                    <Link
                      key={subject}
                      href={`/educom/schools?subject=${encodeURIComponent(subject)}`}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-orange-500 hover:text-orange-300"
                    >
                      {subject}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="text-xs font-medium text-orange-400">SmartPrepAfrica.com Partners</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold">
              Become a SmartPrepAfrica.com Partner
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Earn while helping students learn. Refer students and schools to SmartPrepAfrica.com
              and get rewarded for the ones who stick around.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/partners"
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Become a Partner
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

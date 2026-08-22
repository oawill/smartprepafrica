"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

type Slide = {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  copy: string;
  cta?: { label: string; href: string };
};

const SLIDES: Slide[] = [
  {
    src: "/homepage/carousel-1-learn.png",
    alt: "A student studying at a desk with an open notebook, textbooks, and a SmartPrepAfrica.com laptop sticker",
    eyebrow: "Learn",
    title: "Learn Smarter",
    copy: "Build confidence one topic at a time.",
  },
  {
    src: "/homepage/carousel-2-practice.png",
    alt: "A student smiling while writing in a notebook beside a stack of WAEC, NECO and JAMB past-question books",
    eyebrow: "Practice",
    title: "Practice Your Way",
    copy: "Questions designed around the exams that matter.",
  },
  {
    src: "/homepage/carousel-3-understand.png",
    alt: "Two secondary school students in uniform reviewing a lesson together on a laptop in class",
    eyebrow: "Understand",
    title: "Understand Your Mistakes",
    copy: "Get explanations that help you improve.",
  },
  {
    src: "/homepage/carousel-4-prepare.png",
    alt: "A mother and daughter following a live SmartPrepAfrica Learning class together on a laptop",
    eyebrow: "SmartPrepAfrica Learning",
    title: "Learn Beyond Your School",
    copy: "Join live classes and courses from great teachers and schools across Nigeria.",
    cta: { label: "Explore Learning", href: "/educom" },
  },
  {
    src: "/homepage/carousel-5-succeed.png",
    alt: "A family gathered around a laptop following a live SmartPrepAfrica Learning mathematics class",
    eyebrow: "Succeed",
    title: "Ready for What's Next",
    copy: "Turn preparation into better results.",
  },
];

const AUTOPLAY_MS = 5500;
const SWIPE_THRESHOLD_PX = 40;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Lazy initializer (not an effect + setState) avoids an extra render pass
  // — still SSR-safe since it only runs client-side, on mount.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Autoplay — a setTimeout keyed on `index` rather than setInterval, so
  // every manual navigation (click, dot, swipe, keyboard) restarts the
  // countdown instead of racing a pending auto-advance. Loops naturally via
  // goTo's modulo wraparound, and stops entirely (not just visually) when
  // the user prefers reduced motion.
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [paused, reducedMotion, index]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) prev();
    else if (delta < -SWIPE_THRESHOLD_PX) next();
    touchStartX.current = null;
    setPaused(false);
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="What SmartPrepAfrica.com makes possible"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20 sm:h-[340px] lg:h-[440px]">
        <div
          className={`flex h-full ${reducedMotion ? "" : "transition-transform duration-700 ease-out"}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={slide.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              aria-hidden={i !== index}
              className="relative h-full w-full shrink-0"
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
              />
              {/* Scrim for text contrast, plus a touch of brand color. */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-green-500/10" />

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-950">
                  {slide.eyebrow}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
                  {slide.title}
                </h3>
                <p className="mt-1 max-w-md text-sm text-slate-200 sm:text-base">{slide.copy}</p>
                {slide.cta && (
                  <Link
                    href={slide.cta.href}
                    tabIndex={i === index ? undefined : -1}
                    className="relative z-10 mt-3 inline-block text-sm font-semibold text-orange-300 hover:text-orange-200 hover:underline"
                  >
                    {slide.cta.label} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Visually-hidden live region for screen readers. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Slide {index + 1} of {SLIDES.length}: {SLIDES[index].title}.
        </p>

        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-9 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950/50 p-2 text-white backdrop-blur-sm transition hover:bg-slate-950/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:top-1/2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-9 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950/50 p-2 text-white backdrop-blur-sm transition hover:bg-slate-950/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:top-1/2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 ${
              i === index ? "w-6 bg-orange-500" : "w-2 bg-slate-600 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

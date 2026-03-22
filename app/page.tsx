import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate flex flex-1 overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_20%,#d7f4ff_0%,transparent_35%),radial-gradient(circle_at_90%_0%,#f8e4ff_0%,transparent_30%),linear-gradient(160deg,#f8fbff_0%,#f2f8ff_45%,#eef6ff_100%)]" />
      <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="absolute bottom-10 right-0 -z-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-700">
              Aart
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 md:text-5xl">
              Words Mastery Tracker
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Parent Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Parent Signup
            </Link>
          </div>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-cyan-200/80 bg-white/80 p-6 backdrop-blur-sm lg:col-span-2">
            <h2 className="font-space-grotesk text-2xl font-bold text-slate-900 md:text-3xl">
              Track each sound where it matters most: beginning, middle, and
              end.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              Aart helps parents build articulation confidence by logging
              mastery targets per sound position, then generating words,
              phrases, and sentence prompts that stay inside what your child can
              already say well.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-cyan-700">
                  Speech Targets
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Track attempts, scores, and mastery by position.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-cyan-700">
                  Word Intelligence
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Store reading level, part of speech, and sound maps.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-cyan-700">
                  Auto Suggestions
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Generate safe phrases and short sentence prompts.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
              Deployment
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              Vercel + Supabase Ready
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Designed for deployment at aart.autismarcade.com with secure
              parent auth and RLS-backed data.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600"
            >
              Open Dashboard
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}

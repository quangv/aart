import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate flex flex-1 overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_20%,#ffd9be_0%,transparent_35%),radial-gradient(circle_at_90%_0%,#fff0ba_0%,transparent_30%),linear-gradient(160deg,#fff7ed_0%,#fff2e2_45%,#ffe8d4_100%)]" />
      <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-[#f4b89a]/40 blur-3xl" />
      <div className="absolute bottom-10 right-0 -z-10 h-72 w-72 rounded-full bg-[#ffd66b]/30 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#2d78c4]">
              Aart
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[#2f2a26] md:text-5xl">
              Words Mastery Tracker
            </h1>
            <p className="mt-2 text-sm font-medium text-[#7ba35f]">
              Meet Aart the aardvark, your articulation buddy.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[#e8b795] bg-[#fffdf8] px-5 py-2 text-sm font-semibold text-[#5f4a37] transition hover:bg-[#fff3e7]"
            >
              Parent Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#2d78c4] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2367aa]"
            >
              Parent Signup
            </Link>
          </div>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8]/90 p-6 backdrop-blur-sm lg:col-span-2">
            <h2 className="font-space-grotesk text-2xl font-bold text-[#2f2a26] md:text-3xl">
              Track each sound where it matters most: beginning, middle, and
              end.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f4a37]">
              Aart helps parents build articulation confidence by logging
              mastery targets per sound position, then generating words,
              phrases, and sentence prompts that stay inside what your child can
              already say well.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#f0dac9] bg-[#fff5eb] p-4">
                <p className="text-sm font-semibold text-[#2d78c4]">
                  Speech Targets
                </p>
                <p className="mt-2 text-sm text-[#6c5846]">
                  Track attempts, scores, and mastery by position.
                </p>
              </div>
              <div className="rounded-2xl border border-[#f0dac9] bg-[#fff5eb] p-4">
                <p className="text-sm font-semibold text-[#2d78c4]">
                  Word Intelligence
                </p>
                <p className="mt-2 text-sm text-[#6c5846]">
                  Store reading level, part of speech, and sound maps.
                </p>
              </div>
              <div className="rounded-2xl border border-[#f0dac9] bg-[#fff5eb] p-4">
                <p className="text-sm font-semibold text-[#2d78c4]">
                  Auto Suggestions
                </p>
                <p className="mt-2 text-sm text-[#6c5846]">
                  Generate safe phrases and short sentence prompts.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.25em] text-[#7ba35f]">
              Deployment
            </p>
            <h3 className="mt-2 text-xl font-bold text-[#2f2a26]">
              Vercel + Supabase Ready
            </h3>
            <p className="mt-3 text-sm text-[#5f4a37]">
              Designed for deployment at aart.autismarcade.com with secure
              parent auth and RLS-backed data.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex rounded-lg bg-[#2d78c4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2367aa]"
            >
              Open Dashboard
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}

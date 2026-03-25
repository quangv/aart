import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWordPracticePlanForChild } from "@/lib/recommendations";

function WordSection({
  title,
  subtitle,
  words,
  tone,
}: {
  title: string;
  subtitle: string;
  words: { id: string; text: string; reading_level: number }[];
  tone: "mastered" | "working" | "stretch";
}) {
  if (!words.length) {
    return null;
  }

  const styles = {
    mastered: {
      card: "border-[#b8d696] bg-[#f7fceb]",
      chip: "border-[#b8d696] bg-[#f0f9e5] text-[#5a7f44]",
    },
    working: {
      card: "border-[#efc8ab] bg-[#fff8f1]",
      chip: "border-[#efc8ab] bg-[#fff5eb] text-[#5f4a37]",
    },
    stretch: {
      card: "border-[#d0dff2] bg-[#f5faff]",
      chip: "border-[#bfd6ef] bg-[#eaf4ff] text-[#2d5f8f]",
    },
  }[tone];

  return (
    <section className={`rounded-3xl border p-6 shadow-sm ${styles.card}`}>
      <h2 className="text-xl font-semibold text-[#2f2a26]">{title}</h2>
      <p className="mt-1 text-sm text-[#5f4a37]">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {words.map((word) => (
          <span
            key={word.id}
            className={`rounded-full border px-3 py-1 text-sm ${styles.chip}`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </section>
  );
}

export default async function SuggestedWordsPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, name")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (!child) {
    redirect("/dashboard");
  }

  const plan = await getWordPracticePlanForChild(supabase, childId);
  const hasAnySection =
    plan.masteredWords.length > 0 ||
    plan.workingWords.length > 0 ||
    plan.stretchWords.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[#2d78c4]">
            Suggested Words
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#2f2a26]">
            {child.name}&apos;s Practice Plan
          </h1>
          <p className="mt-2 text-sm text-[#5f4a37]">
            Words grouped by current progress on top phonemes.
          </p>
        </div>

        <Link
          href={`/dashboard/${childId}`}
          className="inline-flex items-center rounded-lg border border-[#e8b795] bg-[#fff7ee] px-3 py-2 text-sm font-semibold text-[#5f4a37] transition hover:bg-[#ffefdf]"
        >
          Back to Child Dashboard
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-[#efc8ab] bg-[#fffdf8] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#5f4a37]">
          Top Phonemes
        </h2>
        {plan.topPhonemes.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.topPhonemes.map((item) => (
              <span
                key={item.soundId}
                className="rounded-full border border-[#bfd6ef] bg-[#eaf4ff] px-3 py-1 text-sm text-[#2d5f8f]"
              >
                {item.label} ({item.avgScore.toFixed(1)})
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#7b6652]">
            No phoneme progress yet. Add a few sound scores first.
          </p>
        )}
      </section>

      <div className="mt-6 space-y-6">
        <WordSection
          title="Mastered Words"
          subtitle="Words built from your child's top phonemes that are already mastered."
          words={plan.masteredWords}
          tone="mastered"
        />

        <WordSection
          title="Working On Words"
          subtitle="Words that include top phonemes your child is currently practicing."
          words={plan.workingWords}
          tone="working"
        />

        <WordSection
          title="Stretch Words"
          subtitle="Next challenge words using top phonemes with little or no direct practice yet."
          words={plan.stretchWords}
          tone="stretch"
        />

        {!hasAnySection ? (
          <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 text-sm text-[#7b6652] shadow-sm">
            No suggested words yet. Continue scoring sounds, then revisit this
            page.
          </section>
        ) : null}
      </div>
    </main>
  );
}

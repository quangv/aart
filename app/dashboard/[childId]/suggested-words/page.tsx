import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWordPracticePlanForChild } from "@/lib/recommendations";
import ReadingLevelFilteredSections from "./_components/reading-level-filtered-sections";

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
        <ReadingLevelFilteredSections
          childId={childId}
          masteredWords={plan.masteredWords}
          workingWords={plan.workingWords}
          stretchWords={plan.stretchWords}
        />
      </div>
    </main>
  );
}

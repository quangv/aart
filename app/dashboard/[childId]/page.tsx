import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecommendationsForChild } from "@/lib/recommendations";

const positions = ["beginning", "middle", "end"] as const;

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { childId } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, name, notes")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (!child) {
    notFound();
  }

  const { data: sounds } = await supabase
    .from("sounds")
    .select(
      "id, code, label, ipa, stage_number, stage_name, stage_focus, stage_order",
    )
    .order("stage_number", { ascending: true })
    .order("stage_order", { ascending: true })
    .order("code", { ascending: true });

  const { data: progressRows } = await supabase
    .from("child_sound_progress")
    .select("sound_id, position, score, attempts, mastered, last_practiced_at")
    .eq("child_id", childId);

  const progressMap = new Map<
    string,
    NonNullable<typeof progressRows>[number]
  >();
  for (const row of progressRows ?? []) {
    progressMap.set(`${row.sound_id}:${row.position}`, row);
  }

  const recommendations = await getRecommendationsForChild(supabase, childId);

  type SoundRow = NonNullable<typeof sounds>[number];
  const stageGroups: {
    stageNumber: number;
    stageName: string;
    stageFocus: string;
    sounds: SoundRow[];
  }[] = [];
  for (const sound of sounds ?? []) {
    const last = stageGroups[stageGroups.length - 1];
    if (!last || last.stageNumber !== sound.stage_number) {
      stageGroups.push({
        stageNumber: sound.stage_number,
        stageName: sound.stage_name,
        stageFocus: sound.stage_focus,
        sounds: [sound],
      });
    } else {
      last.sounds.push(sound);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-[#2d78c4]">
          Child Tracker
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#2f2a26]">{child.name}</h1>
        {child.notes ? (
          <p className="mt-2 text-sm text-[#5f4a37]">{child.notes}</p>
        ) : null}
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-semibold text-[#2f2a26]">
            Sound Mastery by Position
          </h2>
          <p className="mt-2 text-sm text-[#5f4a37]">
            Track each sound in beginning, middle, and end positions. A score of
            80+ can be marked as mastered.
          </p>

          <div className="mt-6 space-y-8">
            {stageGroups.map(
              ({ stageNumber, stageName, stageFocus, sounds: stageSounds }) => (
                <div key={stageNumber}>
                  <p className="mb-3 text-sm font-semibold text-[#2d78c4]">
                    Stage {stageNumber}: {stageName}
                    <span className="ml-2 font-normal text-[#5f4a37]">
                      {stageFocus}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {stageSounds.map((sound) => {
                      const isMastered = positions.some(
                        (pos) =>
                          progressMap.get(`${sound.id}:${pos}`)?.mastered,
                      );
                      return (
                        <button
                          key={sound.id}
                          type="button"
                          className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 font-semibold transition hover:scale-105 ${
                            isMastered
                              ? "border-[#b8d696] bg-[#f0f9e5] text-[#5a7f44]"
                              : "border-[#efc8ab] bg-[#fff5eb] text-[#2f2a26] hover:border-[#2d78c4]"
                          }`}
                        >
                          <span className="text-xl">{sound.ipa}</span>
                          <span className="mt-1 px-1 text-center text-[10px] leading-tight text-[#7b6652]">
                            {sound.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2f2a26]">
              Suggested Words
            </h2>
            <p className="mt-2 text-sm text-[#5f4a37]">
              Generated from sounds currently mastered for this child.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendations.words.length ? (
                recommendations.words.map((word) => (
                  <span
                    key={word.id}
                    className="rounded-full border border-[#b8d696] bg-[#f0f9e5] px-3 py-1 text-sm text-[#5a7f44]"
                  >
                    {word.text}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[#7b6652]">
                  No available words yet. Mark more sounds as mastered.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2f2a26]">
              Phrase Builder
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5f4a37]">
              {recommendations.phrases.length ? (
                recommendations.phrases.map((phrase) => (
                  <li
                    key={phrase}
                    className="rounded-lg bg-[#fff5eb] px-3 py-2"
                  >
                    {phrase}
                  </li>
                ))
              ) : (
                <li className="text-[#7b6652]">No phrase suggestions yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2f2a26]">
              Sentence Builder
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5f4a37]">
              {recommendations.sentences.length ? (
                recommendations.sentences.map((sentence) => (
                  <li
                    key={sentence}
                    className="rounded-lg bg-[#fff5eb] px-3 py-2"
                  >
                    {sentence}
                  </li>
                ))
              ) : (
                <li className="text-[#7b6652]">No sentence suggestions yet.</li>
              )}
            </ul>
          </section>
        </div>
      </section>

      {message ? (
        <p className="mt-6 rounded-lg border border-[#ffd66b] bg-[#fff7de] px-3 py-2 text-sm text-[#7a5b16]">
          {message}
        </p>
      ) : null}
    </main>
  );
}

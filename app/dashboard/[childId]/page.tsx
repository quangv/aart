import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { upsertProgressAction } from "@/app/dashboard/actions";
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

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-[#5f4a37]">
                  <th className="px-2 py-1">Sound</th>
                  <th className="px-2 py-1">Beginning</th>
                  <th className="px-2 py-1">Middle</th>
                  <th className="px-2 py-1">End</th>
                </tr>
              </thead>
              <tbody>
                {(sounds ?? []).map((sound, soundIndex, allSounds) => {
                  const previousSound =
                    soundIndex > 0 ? allSounds[soundIndex - 1] : null;
                  const isFirstInStage =
                    !previousSound ||
                    previousSound.stage_number !== sound.stage_number;

                  return (
                    <Fragment key={sound.id}>
                      {isFirstInStage ? (
                        <tr key={`stage-${sound.stage_number}`}>
                          <td
                            colSpan={4}
                            className="pt-4 text-sm font-semibold text-[#2d78c4]"
                          >
                            Stage {sound.stage_number}: {sound.stage_name}
                            <span className="ml-2 font-normal text-[#5f4a37]">
                              {sound.stage_focus}
                            </span>
                          </td>
                        </tr>
                      ) : null}

                      <tr className="align-top">
                        <td className="rounded-l-xl bg-[#fff5eb] px-2 py-2">
                          <p className="font-semibold text-[#2f2a26]">
                            /{sound.code}/
                          </p>
                          <p className="text-xs text-[#7b6652]">
                            {sound.ipa ?? sound.label}
                          </p>
                        </td>

                        {positions.map((position, index) => {
                          const key = `${sound.id}:${position}`;
                          const existing = progressMap.get(key);
                          const edgeClass =
                            index === positions.length - 1
                              ? " rounded-r-xl"
                              : "";

                          return (
                            <td
                              key={position}
                              className={`bg-[#fff5eb] px-2 py-2${edgeClass}`}
                            >
                              <form
                                action={upsertProgressAction}
                                className="space-y-2"
                              >
                                <input
                                  type="hidden"
                                  name="childId"
                                  value={childId}
                                />
                                <input
                                  type="hidden"
                                  name="soundId"
                                  value={sound.id}
                                />
                                <input
                                  type="hidden"
                                  name="position"
                                  value={position}
                                />
                                <input
                                  type="hidden"
                                  name="returnPath"
                                  value={`/dashboard/${childId}`}
                                />

                                <label className="block text-xs text-[#7b6652]">
                                  Score
                                </label>
                                <input
                                  name="score"
                                  type="number"
                                  min={0}
                                  max={100}
                                  defaultValue={existing?.score ?? 0}
                                  className="w-full rounded-md border border-[#e8b795] px-2 py-1 outline-none ring-[#8ec7ed] transition focus:ring"
                                />

                                <label className="flex items-center gap-2 text-xs text-[#5f4a37]">
                                  <input
                                    name="mastered"
                                    type="checkbox"
                                    defaultChecked={existing?.mastered ?? false}
                                  />
                                  Mastered
                                </label>

                                <button
                                  type="submit"
                                  className="w-full rounded-md bg-[#2d78c4] px-2 py-1 text-xs font-semibold text-white hover:bg-[#2367aa]"
                                >
                                  Save
                                </button>

                                <p className="text-[11px] text-[#7b6652]">
                                  Attempts: {existing?.attempts ?? 0}
                                </p>
                              </form>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
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

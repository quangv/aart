import Link from "next/link";
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
    .select("id, code, label, ipa")
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-sky-700">
            Child Tracker
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {child.name}
          </h1>
          {child.notes ? (
            <p className="mt-2 text-sm text-slate-600">{child.notes}</p>
          ) : null}
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Sound Mastery by Position
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Track each sound in beginning, middle, and end positions. A score of
            80+ can be marked as mastered.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-2 py-1">Sound</th>
                  <th className="px-2 py-1">Beginning</th>
                  <th className="px-2 py-1">Middle</th>
                  <th className="px-2 py-1">End</th>
                </tr>
              </thead>
              <tbody>
                {(sounds ?? []).map((sound) => (
                  <tr key={sound.id} className="align-top">
                    <td className="rounded-l-xl bg-slate-50 px-2 py-2">
                      <p className="font-semibold text-slate-900">
                        /{sound.code}/
                      </p>
                      <p className="text-xs text-slate-500">
                        {sound.ipa ?? sound.label}
                      </p>
                    </td>

                    {positions.map((position, index) => {
                      const key = `${sound.id}:${position}`;
                      const existing = progressMap.get(key);
                      const edgeClass =
                        index === positions.length - 1 ? " rounded-r-xl" : "";

                      return (
                        <td
                          key={position}
                          className={`bg-slate-50 px-2 py-2${edgeClass}`}
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

                            <label className="block text-xs text-slate-500">
                              Score
                            </label>
                            <input
                              name="score"
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={existing?.score ?? 0}
                              className="w-full rounded-md border border-slate-300 px-2 py-1"
                            />

                            <label className="flex items-center gap-2 text-xs text-slate-700">
                              <input
                                name="mastered"
                                type="checkbox"
                                defaultChecked={existing?.mastered ?? false}
                              />
                              Mastered
                            </label>

                            <button
                              type="submit"
                              className="w-full rounded-md bg-cyan-700 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-600"
                            >
                              Save
                            </button>

                            <p className="text-[11px] text-slate-500">
                              Attempts: {existing?.attempts ?? 0}
                            </p>
                          </form>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-1">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Suggested Words
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Generated from sounds currently mastered for this child.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendations.words.length ? (
                recommendations.words.map((word) => (
                  <span
                    key={word.id}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm text-cyan-800"
                  >
                    {word.text}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No available words yet. Mark more sounds as mastered.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Phrase Builder
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {recommendations.phrases.length ? (
                recommendations.phrases.map((phrase) => (
                  <li key={phrase} className="rounded-lg bg-slate-50 px-3 py-2">
                    {phrase}
                  </li>
                ))
              ) : (
                <li className="text-slate-500">No phrase suggestions yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Sentence Builder
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {recommendations.sentences.length ? (
                recommendations.sentences.map((sentence) => (
                  <li
                    key={sentence}
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    {sentence}
                  </li>
                ))
              ) : (
                <li className="text-slate-500">No sentence suggestions yet.</li>
              )}
            </ul>
          </section>
        </div>
      </section>

      {message ? (
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      ) : null}
    </main>
  );
}

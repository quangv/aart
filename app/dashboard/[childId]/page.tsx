import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRecommendationsForChild } from "@/lib/recommendations";
import { clearLastChildAction } from "@/app/dashboard/actions";
import SoundGrid from "./_components/sound-grid";

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
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-[#2f2a26]">
            Profile not found
          </p>
          <p className="mt-2 text-sm text-[#5f4a37]">
            This child profile doesn&apos;t exist or you don&apos;t have access
            to it.
          </p>
          <form action={clearLastChildAction} className="mt-6">
            <button
              type="submit"
              className="rounded-lg bg-[#2d78c4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2367aa]"
            >
              Back to Profiles
            </button>
          </form>
        </div>
      </main>
    );
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

  const { data: wordRows } = await supabase
    .from("words")
    .select("id, text, reading_level")
    .order("reading_level", { ascending: true })
    .order("text", { ascending: true });

  const { data: wordSoundRows } = await supabase
    .from("word_sounds")
    .select("sound_id, word_id, position");

  const progressRecord: Record<
    string,
    { score: number | null; attempts: number | null; mastered: boolean | null }
  > = {};
  for (const row of progressRows ?? []) {
    progressRecord[`${row.sound_id}:${row.position}`] = {
      score: row.score,
      attempts: row.attempts,
      mastered: row.mastered,
    };
  }

  const wordById = new Map<string, { text: string; reading_level: number }>();
  for (const word of wordRows ?? []) {
    wordById.set(word.id, {
      text: word.text,
      reading_level: word.reading_level,
    });
  }

  const exampleWordsBySoundPosition: Record<string, string[]> = {};
  for (const row of wordSoundRows ?? []) {
    const soundId = row.sound_id;
    const position = row.position;
    if (!soundId || !position) {
      continue;
    }

    const word = wordById.get(row.word_id);
    if (!word) {
      continue;
    }

    const key = `${soundId}:${position}`;
    const existing = exampleWordsBySoundPosition[key] ?? [];
    if (!existing.includes(word.text) && existing.length < 6) {
      existing.push(word.text);
      exampleWordsBySoundPosition[key] = existing;
    }
  }

  const recommendations = await getRecommendationsForChild(supabase, childId);

  type SoundRow = {
    id: string;
    code: string;
    label: string;
    ipa: string;
    stage_number: number;
    stage_name: string;
    stage_focus: string;
  };
  const stageGroups: {
    stageNumber: number;
    stageName: string;
    stageFocus: string;
    sounds: SoundRow[];
  }[] = [];
  for (const sound of sounds ?? []) {
    const normalizedSound: SoundRow = {
      id: sound.id,
      code: sound.code,
      label: sound.label ?? sound.code,
      ipa: sound.ipa ?? sound.label,
      stage_number: sound.stage_number,
      stage_name: sound.stage_name ?? "",
      stage_focus: sound.stage_focus ?? "",
    };

    const last = stageGroups[stageGroups.length - 1];
    if (!last || last.stageNumber !== normalizedSound.stage_number) {
      stageGroups.push({
        stageNumber: normalizedSound.stage_number,
        stageName: normalizedSound.stage_name,
        stageFocus: normalizedSound.stage_focus,
        sounds: [normalizedSound],
      });
    } else {
      last.sounds.push(normalizedSound);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8">
      <div>
        <Link
          href="/dashboard?manage=1"
          className="inline-flex items-center gap-1 text-sm text-[#2d78c4] hover:underline"
        >
          ← Profiles
        </Link>
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-[#2d78c4]">
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
            Track each sound in beginning, middle, and end positions. Scores of
            8+ are marked as mastered automatically.
          </p>

          <SoundGrid
            childId={childId}
            stageGroups={stageGroups}
            progressRecord={progressRecord}
            exampleWordsBySoundPosition={exampleWordsBySoundPosition}
          />
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

"use client";

import { useState } from "react";
import {
  upsertProgressAction,
  updateProgressRecordAction,
  deleteProgressRecordAction,
} from "@/app/dashboard/actions";
import PhonemeButton from "./phoneme-button";
import SoundModal from "./sound-modal";

const positions = ["beginning", "middle", "end"] as const;

type ProgressRow = {
  score: number | null;
  attempts: number | null;
  mastered: boolean | null;
  notes: string | null;
};

type ScoreRecord = {
  id: number;
  score: number;
  notes: string | null;
  recorded_at: string;
};

type SoundRow = {
  id: string;
  code: string;
  label: string;
  ipa: string;
  stage_number: number;
  stage_name: string;
  stage_focus: string;
};

type StageGroup = {
  stageNumber: number;
  stageName: string;
  stageFocus: string;
  sounds: SoundRow[];
};

type MasteryItem = {
  sound: SoundRow;
  avgScore: number;
  masteredParts: number;
  scoredParts: number;
};

function MasteryRankingChart({ items }: { items: MasteryItem[] }) {
  const chartItems = items.slice(0, 12);

  if (chartItems.length === 0) {
    return <p className="px-3 py-3 text-xs text-[#7b6652]">No scores yet.</p>;
  }

  return (
    <div className="space-y-1.5 px-3 py-3">
      {chartItems.map((item) => {
        const widthPercent = Math.max(
          0,
          Math.min(100, (item.avgScore / 10) * 100),
        );
        const isMastered = item.avgScore >= 8;

        return (
          <div
            key={`chart-${item.sound.id}`}
            className="grid grid-cols-[52px_1fr_34px] items-center gap-2"
          >
            <span className="truncate text-xs font-semibold text-[#2f2a26]">
              {item.sound.ipa}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#f7dfce]">
              <div
                className={`h-full rounded-full ${
                  isMastered ? "bg-[#5a7f44]" : "bg-[#2d78c4]"
                }`}
                style={{ width: `${widthPercent}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-right text-[11px] tabular-nums text-[#7b6652]">
              {item.avgScore.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  childId: string;
  stageGroups: StageGroup[];
  progressRecord: Record<string, ProgressRow>;
  exampleWordsBySoundPosition: Record<string, string[]>;
  scoreHistoryBySoundPosition: Record<string, ScoreRecord[]>;
};

export default function SoundGrid({
  childId,
  stageGroups,
  progressRecord,
  exampleWordsBySoundPosition,
  scoreHistoryBySoundPosition,
}: Props) {
  const [selectedSound, setSelectedSound] = useState<SoundRow | null>(null);

  const allSounds = stageGroups.flatMap((group) => group.sounds);
  const masteryRanking: MasteryItem[] = allSounds
    .map((sound) => {
      const scores = positions.map(
        (pos) => progressRecord[`${sound.id}:${pos}`]?.score ?? 0,
      );
      const masteredParts = positions.filter(
        (pos) => progressRecord[`${sound.id}:${pos}`]?.mastered,
      ).length;
      const scoredParts = positions.filter(
        (pos) => progressRecord[`${sound.id}:${pos}`]?.score != null,
      ).length;
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / 3;

      return {
        sound,
        avgScore,
        masteredParts,
        scoredParts,
      };
    })
    .sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.masteredParts !== a.masteredParts)
        return b.masteredParts - a.masteredParts;
      if (b.scoredParts !== a.scoredParts) return b.scoredParts - a.scoredParts;
      return a.sound.code.localeCompare(b.sound.code);
    });

  return (
    <>
      <div className="mt-6 space-y-8">
        {stageGroups.map(({ stageNumber, stageName, stageFocus, sounds }) => (
          <div key={stageNumber}>
            <p className="mb-3 text-sm font-semibold text-[#2d78c4]">
              Stage {stageNumber}: {stageName}
              <span className="ml-2 font-normal text-[#5f4a37]">
                {stageFocus}
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              {sounds.map((sound) => {
                const isMastered = positions.some(
                  (pos) => progressRecord[`${sound.id}:${pos}`]?.mastered,
                );
                const avgScore =
                  positions
                    .map(
                      (pos) => progressRecord[`${sound.id}:${pos}`]?.score ?? 0,
                    )
                    .reduce((sum, score) => sum + score, 0) / 3;

                return (
                  <PhonemeButton
                    key={sound.id}
                    onClick={() => setSelectedSound(sound)}
                    ipa={sound.ipa}
                    label={sound.label}
                    score={avgScore}
                    mastered={isMastered}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-[#efc8ab] bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5f4a37]">
          Phoneme Mastery Ranking
        </h3>
        <p className="mt-1 text-xs text-[#7b6652]">
          Average of beginning, middle, and end scores (missing scores count as
          0).
        </p>

        <div className="mt-3 rounded-xl border border-[#f7dfce] bg-[#fffdf8]">
          <div className="flex items-center justify-between border-b border-[#f7dfce] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7b6652]">
              Mastery Chart
            </p>
            <p className="text-[10px] text-[#7b6652]">Top 12</p>
          </div>
          <MasteryRankingChart items={masteryRanking} />
        </div>

        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[#f7dfce] bg-[#fffdf8]">
          <ul className="divide-y divide-[#f7dfce]">
            {masteryRanking.map(
              ({ sound, avgScore, masteredParts, scoredParts }) => (
                <li
                  key={`rank-${sound.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2f2a26]">
                      {sound.ipa}
                      <span className="ml-2 text-xs font-normal text-[#7b6652]">
                        {sound.label}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#7b6652]">
                      {masteredParts}/3 mastered • {scoredParts}/3 scored
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#fff5eb] px-2 py-1 text-right">
                    <p className="text-xs text-[#7b6652]">Avg</p>
                    <p className="text-sm font-bold tabular-nums text-[#2d78c4]">
                      {avgScore.toFixed(1)}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {selectedSound ? (
        <SoundModal
          isOpen={selectedSound !== null}
          onClose={() => setSelectedSound(null)}
          childId={childId}
          sound={selectedSound}
          exampleWordsByPosition={{
            beginning:
              exampleWordsBySoundPosition[`${selectedSound.id}:beginning`] ??
              [],
            middle:
              exampleWordsBySoundPosition[`${selectedSound.id}:middle`] ?? [],
            end: exampleWordsBySoundPosition[`${selectedSound.id}:end`] ?? [],
          }}
          progressAction={upsertProgressAction}
          updateRecordAction={updateProgressRecordAction}
          deleteRecordAction={deleteProgressRecordAction}
          progress={{
            beginning: progressRecord[`${selectedSound.id}:beginning`],
            middle: progressRecord[`${selectedSound.id}:middle`],
            end: progressRecord[`${selectedSound.id}:end`],
          }}
          scoreHistoryByPosition={{
            beginning:
              scoreHistoryBySoundPosition[`${selectedSound.id}:beginning`] ??
              [],
            middle:
              scoreHistoryBySoundPosition[`${selectedSound.id}:middle`] ?? [],
            end: scoreHistoryBySoundPosition[`${selectedSound.id}:end`] ?? [],
          }}
        />
      ) : null}
    </>
  );
}

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
  const masteryRanking = allSounds
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
                return (
                  <PhonemeButton
                    key={sound.id}
                    onClick={() => setSelectedSound(sound)}
                    ipa={sound.ipa}
                    label={sound.label}
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

        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[#f7dfce] bg-[#fffdf8]">
          <ul className="divide-y divide-[#f7dfce]">
            {masteryRanking.map(({ sound, avgScore, masteredParts, scoredParts }) => (
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
            ))}
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

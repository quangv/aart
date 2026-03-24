"use client";

import { useState } from "react";
import { upsertProgressAction } from "@/app/dashboard/actions";
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

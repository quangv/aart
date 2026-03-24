"use client";

import { useState } from "react";
import SoundModal from "./sound-modal";

const positions = ["beginning", "middle", "end"] as const;

type ProgressRow = {
  score: number | null;
  attempts: number | null;
  mastered: boolean | null;
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
};

export default function SoundGrid({
  childId,
  stageGroups,
  progressRecord,
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
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => setSelectedSound(sound)}
                    className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 font-semibold transition hover:scale-105 ${
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
        ))}
      </div>

      {selectedSound ? (
        <SoundModal
          isOpen={selectedSound !== null}
          onClose={() => setSelectedSound(null)}
          childId={childId}
          sound={selectedSound}
          progress={{
            beginning: progressRecord[`${selectedSound.id}:beginning`],
            middle: progressRecord[`${selectedSound.id}:middle`],
            end: progressRecord[`${selectedSound.id}:end`],
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

const positions = ["beginning", "middle", "end"] as const;

type ProgressRow = {
  score: number | null;
  attempts: number | null;
  mastered: boolean | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  sound: {
    id: string;
    code: string;
    label: string;
    ipa: string;
    stage_name: string;
  };
  progress: Partial<Record<(typeof positions)[number], ProgressRow>>;
  exampleWordsByPosition: Partial<Record<(typeof positions)[number], string[]>>;
  progressAction?: (formData: FormData) => void | Promise<void>;
};

export default function SoundModal({
  isOpen,
  onClose,
  childId,
  sound,
  progress,
  exampleWordsByPosition,
  progressAction,
}: Props) {
  const [scores, setScores] = useState<Record<string, number>>({
    beginning: progress.beginning?.score ?? 1,
    middle: progress.middle?.score ?? 1,
    end: progress.end?.score ?? 1,
  });

  const formAction = progressAction;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      {/* Centered panel */}
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center py-6">
          <DialogPanel className="max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#2d78c4]">
                  {sound.stage_name}
                </p>
                <DialogTitle className="mt-1 text-4xl font-bold text-[#2f2a26]">
                  {sound.ipa}
                </DialogTitle>
                <p className="mt-1 text-sm text-[#7b6652]">{sound.label}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-[#7b6652] hover:bg-[#fff5eb] hover:text-[#2f2a26]"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Per-position forms */}
            <div className="mt-6 space-y-4">
              {positions.map((position) => {
                const row = progress[position];
                const exampleWords = exampleWordsByPosition[position] ?? [];
                return (
                  <form key={position} action={formAction}>
                    <input type="hidden" name="childId" value={childId} />
                    <input type="hidden" name="soundId" value={sound.id} />
                    <input type="hidden" name="position" value={position} />
                    <input
                      type="hidden"
                      name="returnPath"
                      value={`/dashboard/${childId}`}
                    />

                    <div className="rounded-2xl border border-[#efc8ab] bg-white px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5f4a37]">
                        {position}
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <div className="mb-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tabular-nums text-[#2f2a26]">
                              {scores[position]}
                            </span>
                            <span className="text-xs text-[#7b6652]">/ 10</span>
                          </div>
                          <input
                            name="score"
                            type="range"
                            min={1}
                            max={10}
                            step={0.5}
                            value={scores[position]}
                            onChange={(e) =>
                              setScores((prev) => ({
                                ...prev,
                                [position]: Number(e.target.value),
                              }))
                            }
                            className="w-full accent-[#2d78c4]"
                          />
                          <div className="mt-0.5 flex justify-between text-[10px] text-[#7b6652]">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="mb-0.5 rounded-lg bg-[#2d78c4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2367aa]"
                        >
                          Save
                        </button>
                      </div>
                      {row?.attempts != null && row.attempts > 0 ? (
                        <p className="mt-1 text-[11px] text-[#7b6652]">
                          {row.attempts} attempt{row.attempts !== 1 ? "s" : ""}
                        </p>
                      ) : null}

                      <div className="mt-3 border-t border-[#f7dfce] pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7b6652]">
                          Example words ({position})
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {exampleWords.length ? (
                            exampleWords.map((word) => (
                              <span
                                key={word}
                                className="rounded-full bg-[#fff5eb] px-2 py-0.5 text-[11px] text-[#5f4a37]"
                              >
                                {word}
                              </span>
                            ))
                          ) : (
                            <p className="text-[11px] text-[#7b6652]">
                              No examples yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                );
              })}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

function ScoreChart({
  records,
}: {
  records: { score: number; recorded_at: string }[];
}) {
  // oldest → newest
  const sorted = [...records].reverse();
  if (sorted.length === 0) return null;

  const W = 280;
  const H = 72;
  const pad = { top: 6, right: 8, bottom: 18, left: 22 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const xOf = (i: number) =>
    sorted.length === 1
      ? pad.left + pw / 2
      : pad.left + (i / (sorted.length - 1)) * pw;
  const yOf = (s: number) => pad.top + ph - ((s - 1) / 9) * ph;

  const points = sorted.map((r, i) => `${xOf(i)},${yOf(r.score)}`).join(" ");
  const latest = sorted[sorted.length - 1];
  const lx = xOf(sorted.length - 1);
  const ly = yOf(latest.score);

  const gridScores = [1, 5, 10];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {/* grid lines */}
      {gridScores.map((s) => {
        const y = yOf(s);
        return (
          <g key={s}>
            <line
              x1={pad.left}
              y1={y}
              x2={W - pad.right}
              y2={y}
              stroke="#f0e0d0"
              strokeWidth="1"
            />
            <text
              x={pad.left - 3}
              y={y + 3.5}
              textAnchor="end"
              fontSize="7"
              fill="#a08070"
            >
              {s}
            </text>
          </g>
        );
      })}

      {/* line */}
      {sorted.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke="#93c5e0"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}

      {/* dots */}
      {sorted.map((r, i) => {
        const isLatest = i === sorted.length - 1;
        return (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yOf(r.score)}
            r={isLatest ? 4 : 2.5}
            fill={isLatest ? "#2d78c4" : "#efc8ab"}
            stroke={isLatest ? "#2367aa" : "#c89060"}
            strokeWidth="1"
          />
        );
      })}

      {/* latest score label */}
      <text
        x={lx}
        y={ly - 7}
        textAnchor={lx > W - 30 ? "end" : lx < 30 ? "start" : "middle"}
        fontSize="8"
        fontWeight="bold"
        fill="#2d78c4"
      >
        {latest.score}
      </text>

      {/* x-axis date labels: first and last */}
      {sorted.length > 1 && (
        <>
          <text
            x={pad.left}
            y={H - 2}
            textAnchor="start"
            fontSize="7"
            fill="#a08070"
          >
            {new Date(sorted[0].recorded_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </text>
          <text
            x={W - pad.right}
            y={H - 2}
            textAnchor="end"
            fontSize="7"
            fill="#a08070"
          >
            {new Date(latest.recorded_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </text>
        </>
      )}
    </svg>
  );
}

const positions = ["beginning", "middle", "end"] as const;
type Position = (typeof positions)[number];

type ProgressRow = {
  score: number | null;
  attempts: number | null;
  mastered: boolean | null;
  notes?: string | null;
};

type ScoreRecord = {
  score: number;
  notes: string | null;
  recorded_at: string;
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
  scoreHistoryByPosition?: Partial<Record<Position, ScoreRecord[]>>;
  progressAction?: (formData: FormData) => void | Promise<void>;
};

export default function SoundModal({
  isOpen,
  onClose,
  childId,
  sound,
  progress,
  exampleWordsByPosition,
  scoreHistoryByPosition,
  progressAction,
}: Props) {
  const [scores, setScores] = useState<Record<Position, number>>({
    beginning: progress.beginning?.score ?? 1,
    middle: progress.middle?.score ?? 1,
    end: progress.end?.score ?? 1,
  });
  const [addNote, setAddNote] = useState("");
  const [activePosition, setActivePosition] = useState<Position | null>(null);

  function openAdd(position: Position) {
    setAddNote("");
    setActivePosition(position);
  }

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

            {activePosition === null ? (
              <div className="mt-6">
                <div className="rounded-2xl border border-[#f7dfce] bg-white px-4 py-3 text-xs text-[#5f4a37]">
                  Read mode: review each position, then click Add to log score
                  and notes.
                </div>

                <div className="mt-4 space-y-4">
                  {positions.map((position) => {
                    const row = progress[position];
                    const exampleWords = exampleWordsByPosition[position] ?? [];
                    return (
                      <div
                        key={position}
                        className="rounded-2xl border border-[#efc8ab] bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#5f4a37]">
                              {position}
                            </p>
                            {row?.score != null ? (
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tabular-nums text-[#2f2a26]">
                                  {row.score}
                                </span>
                                <span className="text-xs text-[#7b6652]">
                                  / 10
                                </span>
                              </div>
                            ) : (
                              <p className="mt-1 text-sm text-[#7b6652]">
                                No score yet.
                              </p>
                            )}
                            {row?.attempts != null && row.attempts > 0 ? (
                              <p className="text-[11px] text-[#7b6652]">
                                {row.attempts} record
                                {row.attempts !== 1 ? "s" : ""}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => openAdd(position)}
                            className="rounded-lg bg-[#2d78c4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2367aa]"
                          >
                            Add
                          </button>
                        </div>

                        {row?.notes ? (
                          <p className="mt-2 rounded-lg bg-[#fff7ee] px-2 py-1 text-[11px] text-[#5f4a37]">
                            Note: {row.notes}
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
                    );
                  })}
                </div>
              </div>
            ) : (
              <form action={formAction} className="mt-6">
                <input type="hidden" name="childId" value={childId} />
                <input type="hidden" name="soundId" value={sound.id} />
                <input type="hidden" name="position" value={activePosition} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={`/dashboard/${childId}`}
                />

                <div className="rounded-2xl border border-[#efc8ab] bg-white px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePosition(null)}
                      className="flex items-center gap-1 text-xs text-[#2d78c4] hover:underline"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Back
                    </button>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5f4a37]">
                    Add score - {activePosition}
                  </p>

                  {/* Score-over-time chart */}
                  {(scoreHistoryByPosition?.[activePosition]?.length ?? 0) >
                  0 ? (
                    <div className="mt-3 rounded-xl bg-[#fffdf8] px-1 py-2">
                      <ScoreChart
                        records={scoreHistoryByPosition![activePosition]!}
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums text-[#2f2a26]">
                          {scores[activePosition]}
                        </span>
                        <span className="text-xs text-[#7b6652]">/ 10</span>
                      </div>
                      <input
                        name="score"
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={scores[activePosition]}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [activePosition]: Number(e.target.value),
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
                  </div>

                  <div className="mt-3">
                    <label
                      htmlFor={`notes-${activePosition}`}
                      className="text-xs font-semibold uppercase tracking-wider text-[#5f4a37]"
                    >
                      Note
                    </label>
                    <textarea
                      id={`notes-${activePosition}`}
                      name="notes"
                      rows={3}
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="Optional note for this record"
                      className="mt-1 w-full rounded-lg border border-[#efc8ab] bg-[#fffdf8] px-3 py-2 text-sm text-[#2f2a26] focus:border-[#2d78c4] focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-[#2d78c4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2367aa]"
                    >
                      Save Progress
                    </button>
                  </div>

                  {/* Score history */}
                  <div className="mt-4 border-t border-[#f7dfce] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7b6652]">
                      Records
                    </p>
                    {(scoreHistoryByPosition?.[activePosition]?.length ?? 0) >
                    0 ? (
                      <div className="mt-2 space-y-1">
                        {scoreHistoryByPosition![activePosition]!.map(
                          (record, i) => (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="text-xs font-semibold tabular-nums text-[#2f2a26]">
                                  {record.score}
                                  <span className="ml-0.5 text-[10px] font-normal text-[#7b6652]">
                                    /10
                                  </span>
                                </span>
                                {record.notes ? (
                                  <p className="text-[11px] text-[#7b6652]">
                                    {record.notes}
                                  </p>
                                ) : null}
                              </div>
                              <span className="whitespace-nowrap text-[10px] text-[#7b6652]">
                                {new Date(
                                  record.recorded_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-[#7b6652]">
                        No records yet. Save your first score above.
                      </p>
                    )}
                  </div>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

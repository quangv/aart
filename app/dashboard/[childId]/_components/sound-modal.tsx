"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

const positions = ["beginning", "middle", "end"] as const;
type Position = (typeof positions)[number];

type ChartRecord = { score: number; recorded_at: string };

const positionColors: Record<Position, { line: string; dot: string }> = {
  beginning: { line: "#2d78c4", dot: "#1f5f9c" },
  middle: { line: "#d1782d", dot: "#b15f1e" },
  end: { line: "#5f8c3b", dot: "#4f742f" },
};

function formatActionError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Request failed. Please try again.";
}

function PositionScoreChart({
  recordsByPosition,
  visiblePositions = positions,
  height = 108,
  showLegend = true,
}: {
  recordsByPosition: Partial<Record<Position, ChartRecord[]>>;
  visiblePositions?: readonly Position[];
  height?: number;
  showLegend?: boolean;
}) {
  const seriesByPosition = visiblePositions.reduce<
    Partial<Record<Position, ChartRecord[]>>
  >((acc, position) => {
    // Records are newest-first in state; chart needs oldest-first.
    acc[position] = [...(recordsByPosition[position] ?? [])].reverse();
    return acc;
  }, {});

  const hasAny = visiblePositions.some(
    (position) => (seriesByPosition[position]?.length ?? 0) > 0,
  );
  if (!hasAny) {
    return (
      <p className="px-2 py-3 text-[11px] text-[#7b6652]">
        No score history yet.
      </p>
    );
  }

  const W = 280;
  const H = height;
  const pad = { top: 6, right: 8, bottom: 18, left: 22 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const maxLen = Math.max(
    ...visiblePositions.map(
      (position) => seriesByPosition[position]?.length ?? 0,
    ),
    1,
  );

  const xOf = (i: number) =>
    maxLen === 1 ? pad.left + pw / 2 : pad.left + (i / (maxLen - 1)) * pw;
  const yOf = (s: number) => pad.top + ph - ((s - 1) / 9) * ph;

  const gridScores = [1, 5, 10];
  const allRecords = visiblePositions.flatMap(
    (position) => seriesByPosition[position] ?? [],
  );
  const oldestRecord = allRecords.reduce<ChartRecord | null>(
    (oldest, record) => {
      if (!oldest) return record;
      return new Date(record.recorded_at) < new Date(oldest.recorded_at)
        ? record
        : oldest;
    },
    null,
  );
  const latestRecord = allRecords.reduce<ChartRecord | null>(
    (latest, record) => {
      if (!latest) return record;
      return new Date(record.recorded_at) > new Date(latest.recorded_at)
        ? record
        : latest;
    },
    null,
  );

  const dateLabel = (date?: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
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

        {/* one line per position */}
        {visiblePositions.map((position) => {
          const series = seriesByPosition[position] ?? [];
          if (series.length === 0) return null;
          const points = series
            .map((r, i) => `${xOf(i)},${yOf(r.score)}`)
            .join(" ");
          const latest = series[series.length - 1];
          const lx = xOf(series.length - 1);
          const ly = yOf(latest.score);

          return (
            <g key={position}>
              {series.length > 1 ? (
                <polyline
                  points={points}
                  fill="none"
                  stroke={positionColors[position].line}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              ) : null}
              {series.map((r, i) => {
                const isLatest = i === series.length - 1;
                return (
                  <circle
                    key={`${position}-${i}`}
                    cx={xOf(i)}
                    cy={yOf(r.score)}
                    r={isLatest ? 3.4 : 2.2}
                    fill={isLatest ? positionColors[position].dot : "#efc8ab"}
                    stroke={positionColors[position].line}
                    strokeWidth="1"
                  />
                );
              })}
              <text
                x={lx}
                y={ly - 6}
                textAnchor={lx > W - 30 ? "end" : lx < 30 ? "start" : "middle"}
                fontSize="7"
                fontWeight="bold"
                fill={positionColors[position].line}
              >
                {latest.score}
              </text>
            </g>
          );
        })}

        <text
          x={pad.left}
          y={H - 2}
          textAnchor="start"
          fontSize="7"
          fill="#a08070"
        >
          {dateLabel(oldestRecord?.recorded_at)}
        </text>
        <text
          x={W - pad.right}
          y={H - 2}
          textAnchor="end"
          fontSize="7"
          fill="#a08070"
        >
          {dateLabel(latestRecord?.recorded_at)}
        </text>
      </svg>

      {showLegend ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {visiblePositions.map((position) => {
            const latest = (seriesByPosition[position] ?? []).at(-1);
            if (!latest) return null;
            return (
              <span
                key={`legend-${position}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#f0e0d0] bg-white px-2 py-0.5 text-[10px] text-[#5f4a37]"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: positionColors[position].line }}
                  aria-hidden="true"
                />
                {position}: {latest.score}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type ProgressRow = {
  score: number | null;
  attempts: number | null;
  mastered: boolean | null;
  notes?: string | null;
};

type ScoreRecord = {
  id: number;
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
  progressAction?: (
    formData: FormData,
  ) => Promise<
    | { error: string }
    | { id: number; score: number; notes: string | null; recorded_at: string }
  >;
  updateRecordAction?: (
    id: number,
    score: number,
    notes: string | null,
    childId: string,
  ) => Promise<
    { error: string } | { id: number; score: number; notes: string | null }
  >;
  deleteRecordAction?: (
    id: number,
    childId: string,
  ) => Promise<{ error: string } | { deletedId: number }>;
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
  updateRecordAction,
  deleteRecordAction,
}: Props) {
  const [scores, setScores] = useState<Record<Position, number>>({
    beginning: progress.beginning?.score ?? 1,
    middle: progress.middle?.score ?? 1,
    end: progress.end?.score ?? 1,
  });
  const [addNote, setAddNote] = useState("");
  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successPosition, setSuccessPosition] = useState<Position | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local copies of progress + history so we can update them without a page reload
  const [localProgress, setLocalProgress] =
    useState<Partial<Record<Position, ProgressRow>>>(progress);
  const [localHistory, setLocalHistory] = useState<
    Partial<Record<Position, ScoreRecord[]>>
  >(scoreHistoryByPosition ?? {});

  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(5);
  const [editNote, setEditNote] = useState("");
  const [editPending, startEditTransition] = useTransition();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [deleteTransPending, startDeleteTransition] = useTransition();
  const [recordError, setRecordError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function openAdd(position: Position) {
    setAddNote("");
    setSubmitError(null);
    setEditingRecordId(null);
    setConfirmingDeleteId(null);
    setRecordError(null);
    setActivePosition(position);
  }

  function recomputeProgress(
    position: Position,
    updatedHistory: ScoreRecord[],
  ) {
    const latest = updatedHistory[0];
    setLocalProgress((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        score: latest?.score ?? null,
        notes: latest?.notes ?? null,
        mastered: latest
          ? latest.score >= 8
          : (prev[position]?.mastered ?? false),
        attempts: updatedHistory.length,
      },
    }));
    if (latest) setScores((prev) => ({ ...prev, [position]: latest.score }));
  }

  function handleEditSave(record: ScoreRecord) {
    if (!updateRecordAction || !activePosition) return;
    startEditTransition(async () => {
      try {
        const result = await updateRecordAction(
          record.id,
          editScore,
          editNote || null,
          childId,
        );
        if ("error" in result) {
          setRecordError(result.error);
          return;
        }
        const updatedHistory = (localHistory[activePosition] ?? []).map((r) =>
          r.id === result.id
            ? { ...r, score: result.score, notes: result.notes }
            : r,
        );
        setLocalHistory((prev) => ({
          ...prev,
          [activePosition]: updatedHistory,
        }));
        recomputeProgress(activePosition, updatedHistory);
        setEditingRecordId(null);
        setRecordError(null);
      } catch (error) {
        setRecordError(formatActionError(error));
      }
    });
  }

  function handleDelete(recordId: number) {
    if (!deleteRecordAction || !activePosition) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteRecordAction(recordId, childId);
        if ("error" in result) {
          setRecordError(result.error);
          setConfirmingDeleteId(null);
          return;
        }
        const updatedHistory = (localHistory[activePosition] ?? []).filter(
          (r) => r.id !== result.deletedId,
        );
        setLocalHistory((prev) => ({
          ...prev,
          [activePosition]: updatedHistory,
        }));
        recomputeProgress(activePosition, updatedHistory);
        setConfirmingDeleteId(null);
        setRecordError(null);
      } catch (error) {
        setRecordError(formatActionError(error));
        setConfirmingDeleteId(null);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!progressAction || !activePosition) return;
    const formData = new FormData(e.currentTarget);
    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await progressAction(formData);
        if ("error" in result) {
          setSubmitError(result.error);
          return;
        }
        const savedPosition = activePosition;
        const newRecord: ScoreRecord = {
          id: result.id,
          score: result.score,
          notes: result.notes,
          recorded_at: result.recorded_at,
        };
        setLocalProgress((prev) => ({
          ...prev,
          [savedPosition]: {
            ...prev[savedPosition],
            score: result.score,
            notes: result.notes,
            attempts: (prev[savedPosition]?.attempts ?? 0) + 1,
            mastered: result.score >= 8,
          },
        }));
        setScores((prev) => ({ ...prev, [savedPosition]: result.score }));
        setLocalHistory((prev) => ({
          ...prev,
          [savedPosition]: [newRecord, ...(prev[savedPosition] ?? [])],
        }));
        setActivePosition(null);
        setSuccessPosition(savedPosition);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(
          () => setSuccessPosition(null),
          3000,
        );
      } catch (error) {
        setSubmitError(formatActionError(error));
      }
    });
  }

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
                {successPosition ? (
                  <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#b8d696] bg-[#f0f9e5] px-4 py-2.5 text-sm font-semibold text-[#5a7f44]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Saved {successPosition} score!
                  </div>
                ) : null}
                <div className="rounded-2xl border border-[#f7dfce] bg-white px-4 py-3 text-xs text-[#5f4a37]">
                  Read mode: review each position, then click Add to log score
                  and notes.
                </div>

                <div className="mt-4 rounded-2xl border border-[#efc8ab] bg-white px-3 py-2">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#7b6652]">
                    All positions trend
                  </p>
                  <PositionScoreChart recordsByPosition={localHistory} />
                </div>

                <div className="mt-4 space-y-4">
                  {positions.map((position) => {
                    const row = localProgress[position];
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
                            {(localHistory[position]?.length ?? 0) > 0 ? (
                              <p className="text-[11px] text-[#7b6652]">
                                {localHistory[position]!.length} record
                                {localHistory[position]!.length !== 1
                                  ? "s"
                                  : ""}
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
              <form onSubmit={handleSubmit} className="mt-6">
                <input type="hidden" name="childId" value={childId} />
                <input type="hidden" name="soundId" value={sound.id} />
                <input type="hidden" name="position" value={activePosition} />

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
                  {(localHistory[activePosition]?.length ?? 0) > 0 ? (
                    <div className="mt-3 rounded-xl bg-[#fffdf8] px-1 py-2">
                      <PositionScoreChart
                        recordsByPosition={localHistory}
                        visiblePositions={[activePosition]}
                        height={84}
                        showLegend={false}
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

                  <div className="mt-4 flex flex-col gap-2">
                    {submitError ? (
                      <p className="rounded-lg border border-[#ffd66b] bg-[#fff7de] px-3 py-2 text-xs text-[#7a5b16]">
                        {submitError}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-[#2d78c4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2367aa] disabled:opacity-60"
                      >
                        {isPending ? "Saving…" : "Save Progress"}
                      </button>
                    </div>
                  </div>

                  {/* Score history */}
                  <div className="mt-4 border-t border-[#f7dfce] pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7b6652]">
                      Records
                    </p>
                    {recordError ? (
                      <p className="mt-2 rounded-lg border border-[#ffd66b] bg-[#fff7de] px-3 py-2 text-xs text-[#7a5b16]">
                        {recordError}
                      </p>
                    ) : null}
                    {(localHistory[activePosition]?.length ?? 0) > 0 ? (
                      <div className="mt-2 divide-y divide-[#f7dfce]">
                        {localHistory[activePosition]!.map((record) =>
                          editingRecordId === record.id ? (
                            /* ── inline edit form ── */
                            <div key={record.id} className="py-2 space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold tabular-nums text-[#2f2a26]">
                                  {editScore}
                                </span>
                                <span className="text-xs text-[#7b6652]">
                                  / 10
                                </span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={10}
                                step={0.5}
                                value={editScore}
                                onChange={(e) =>
                                  setEditScore(Number(e.target.value))
                                }
                                className="w-full accent-[#2d78c4]"
                              />
                              <textarea
                                rows={2}
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Note (optional)"
                                className="w-full rounded-lg border border-[#efc8ab] bg-[#fffdf8] px-2 py-1 text-sm text-[#2f2a26] focus:border-[#2d78c4] focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={editPending}
                                  onClick={() => handleEditSave(record)}
                                  className="rounded-lg bg-[#2d78c4] px-2 py-1 text-xs font-semibold text-white hover:bg-[#2367aa] disabled:opacity-60"
                                >
                                  {editPending ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecordId(null);
                                    setRecordError(null);
                                  }}
                                  className="rounded-lg border border-[#efc8ab] px-2 py-1 text-xs text-[#5f4a37] hover:bg-[#fff5eb]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : confirmingDeleteId === record.id ? (
                            /* ── delete confirmation ── */
                            <div key={record.id} className="py-2 space-y-1">
                              <p className="text-xs text-[#5f4a37]">
                                Delete this record?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={deleteTransPending}
                                  onClick={() => handleDelete(record.id)}
                                  className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                                >
                                  {deleteTransPending ? "Deleting…" : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteId(null)}
                                  className="rounded-lg border border-[#efc8ab] px-2 py-1 text-xs text-[#5f4a37] hover:bg-[#fff5eb]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── normal row ── */
                            <div
                              key={record.id}
                              className="flex items-start justify-between gap-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-semibold tabular-nums text-[#2f2a26]">
                                  {record.score}
                                  <span className="ml-0.5 text-[10px] font-normal text-[#7b6652]">
                                    /10
                                  </span>
                                </span>
                                {record.notes ? (
                                  <p className="truncate text-[11px] text-[#7b6652]">
                                    {record.notes}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="whitespace-nowrap text-[10px] text-[#7b6652]">
                                  {new Date(
                                    record.recorded_at,
                                  ).toLocaleDateString()}
                                </span>
                                {updateRecordAction ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRecordId(record.id);
                                      setEditScore(record.score);
                                      setEditNote(record.notes ?? "");
                                      setRecordError(null);
                                      setConfirmingDeleteId(null);
                                    }}
                                    className="rounded p-0.5 text-[#a08070] hover:text-[#2d78c4]"
                                    aria-label="Edit record"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3 w-3"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      aria-hidden="true"
                                    >
                                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                  </button>
                                ) : null}
                                {deleteRecordAction ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmingDeleteId(record.id);
                                      setEditingRecordId(null);
                                      setRecordError(null);
                                    }}
                                    className="rounded p-0.5 text-[#a08070] hover:text-red-500"
                                    aria-label="Delete record"
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
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>
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

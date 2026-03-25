"use client";

import { useEffect, useState } from "react";

type SuggestionWord = {
  id: string;
  text: string;
  reading_level: number;
};

type WordSectionTone = "mastered" | "working" | "stretch";

function WordSection({
  title,
  subtitle,
  words,
  tone,
}: {
  title: string;
  subtitle: string;
  words: SuggestionWord[];
  tone: WordSectionTone;
}) {
  if (!words.length) {
    return null;
  }

  const styles = {
    mastered: {
      card: "border-[#b8d696] bg-[#f7fceb]",
      chip: "border-[#b8d696] bg-[#f0f9e5] text-[#5a7f44]",
    },
    working: {
      card: "border-[#efc8ab] bg-[#fff8f1]",
      chip: "border-[#efc8ab] bg-[#fff5eb] text-[#5f4a37]",
    },
    stretch: {
      card: "border-[#d0dff2] bg-[#f5faff]",
      chip: "border-[#bfd6ef] bg-[#eaf4ff] text-[#2d5f8f]",
    },
  }[tone];

  return (
    <section className={`rounded-3xl border p-6 shadow-sm ${styles.card}`}>
      <h2 className="text-xl font-semibold text-[#2f2a26]">{title}</h2>
      <p className="mt-1 text-sm text-[#5f4a37]">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {words.map((word) => (
          <span
            key={word.id}
            className={`rounded-full border px-3 py-1 text-sm ${styles.chip}`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function ReadingLevelFilteredSections({
  childId,
  masteredWords,
  workingWords,
  stretchWords,
}: {
  childId: string;
  masteredWords: SuggestionWord[];
  workingWords: SuggestionWord[];
  stretchWords: SuggestionWord[];
}) {
  const storageKey = `aart:suggestedWords:maxReadingLevel:${childId}`;
  const [maxReadingLevel, setMaxReadingLevel] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "all";
    }

    try {
      return window.localStorage.getItem(storageKey) ?? "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, maxReadingLevel);
    } catch {
      // Ignore storage write failures.
    }
  }, [storageKey, maxReadingLevel]);

  const toMaxLevel = (value: string): number | null => {
    if (value === "all") return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const maxLevel = toMaxLevel(maxReadingLevel);
  const filteredMastered =
    maxLevel === null
      ? masteredWords
      : masteredWords.filter((word) => word.reading_level <= maxLevel);
  const filteredWorking =
    maxLevel === null
      ? workingWords
      : workingWords.filter((word) => word.reading_level <= maxLevel);
  const filteredStretch =
    maxLevel === null
      ? stretchWords
      : stretchWords.filter((word) => word.reading_level <= maxLevel);

  const hasAnySection =
    filteredMastered.length > 0 ||
    filteredWorking.length > 0 ||
    filteredStretch.length > 0;

  return (
    <>
      <section className="rounded-2xl border border-[#efc8ab] bg-[#fffdf8] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="reading-level-filter"
            className="text-sm font-semibold uppercase tracking-wider text-[#5f4a37]"
          >
            Reading Level
          </label>
          <select
            id="reading-level-filter"
            value={maxReadingLevel}
            onChange={(event) => setMaxReadingLevel(event.target.value)}
            className="rounded-lg border border-[#e8b795] bg-white px-3 py-2 text-sm text-[#2f2a26] focus:border-[#2d78c4] focus:outline-none"
          >
            <option value="all">All levels</option>
            <option value="1">Level 1 and below</option>
            <option value="2">Level 2 and below</option>
            <option value="3">Level 3 and below</option>
            <option value="4">Level 4 and below</option>
            <option value="5">Level 5 and below</option>
            <option value="6">Level 6 and below</option>
          </select>
          <span className="text-xs text-[#7b6652]">
            Saved on this device for this child.
          </span>
        </div>
      </section>

      <WordSection
        title="Mastered Words"
        subtitle="Words built from your child's top phonemes that are already mastered."
        words={filteredMastered}
        tone="mastered"
      />

      <WordSection
        title="Working On Words"
        subtitle="Words that include top phonemes your child is currently practicing."
        words={filteredWorking}
        tone="working"
      />

      <WordSection
        title="Stretch Words"
        subtitle="Next challenge words using top phonemes with little or no direct practice yet."
        words={filteredStretch}
        tone="stretch"
      />

      {!hasAnySection ? (
        <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 text-sm text-[#7b6652] shadow-sm">
          No suggested words at the selected reading level. Raise the filter or
          continue scoring sounds.
        </section>
      ) : null}
    </>
  );
}

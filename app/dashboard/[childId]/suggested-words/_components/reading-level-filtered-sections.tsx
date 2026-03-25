"use client";

import { useEffect, useState } from "react";
import { words as popularEnglishWords } from "popular-english-words";

type SuggestionWord = {
  id: string;
  text: string;
  reading_level: number;
  frequency_rank: number | null;
};

type WordSectionTone = "mastered" | "working" | "stretch";

const TOP_COMMON_WORD_LIMIT = 5000;
const topCommonWordSet = new Set(
  popularEnglishWords
    .getMostPopular(TOP_COMMON_WORD_LIMIT)
    .map((word) => word.toLowerCase()),
);

function normalizeWordForCommonList(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function isTopCommonWord(word: SuggestionWord): boolean {
  const normalizedWord = normalizeWordForCommonList(word.text);
  if (!normalizedWord) {
    return false;
  }
  if (topCommonWordSet.has(normalizedWord)) {
    return true;
  }

  // Keep backward compatibility with DB-side frequency ranks when present.
  return (
    typeof word.frequency_rank === "number" &&
    word.frequency_rank > 0 &&
    word.frequency_rank <= TOP_COMMON_WORD_LIMIT
  );
}

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
  const levelStorageKey = `aart:suggestedWords:band:${childId}`;
  const uncommonStorageKey = `aart:suggestedWords:hideUncommon:${childId}`;
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [hideUncommon, setHideUncommon] = useState<boolean>(false);
  const [masteredPage, setMasteredPage] = useState(1);
  const [workingPage, setWorkingPage] = useState(1);
  const [stretchPage, setStretchPage] = useState(1);
  const perPage = 24;

  const resetPages = () => {
    setMasteredPage(1);
    setWorkingPage(1);
    setStretchPage(1);
  };

  const handleBandChange = (value: string) => {
    setSelectedBand(value);
    resetPages();
  };

  const handleHideUncommonChange = (checked: boolean) => {
    setHideUncommon(checked);
    resetPages();
  };

  useEffect(() => {
    let timeoutId: number | null = null;
    let uncommonTimeoutId: number | null = null;
    try {
      const savedBand = window.localStorage.getItem(levelStorageKey);
      const savedUncommon = window.localStorage.getItem(uncommonStorageKey);
      if (savedBand && savedBand !== "all") {
        // Defer update so hydration uses the same initial UI as server render.
        timeoutId = window.setTimeout(() => {
          setSelectedBand(savedBand);
        }, 0);
      }
      if (savedUncommon === "1") {
        uncommonTimeoutId = window.setTimeout(() => {
          setHideUncommon(true);
        }, 0);
      }
    } catch {
      // Ignore storage read failures and keep default.
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (uncommonTimeoutId !== null) {
        window.clearTimeout(uncommonTimeoutId);
      }
    };
  }, [levelStorageKey, uncommonStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(levelStorageKey, selectedBand);
      window.localStorage.setItem(uncommonStorageKey, hideUncommon ? "1" : "0");
    } catch {
      // Ignore storage write failures.
    }
  }, [levelStorageKey, uncommonStorageKey, selectedBand, hideUncommon]);

  const allWordsById = new Map<string, SuggestionWord>();
  for (const word of [...masteredWords, ...workingWords, ...stretchWords]) {
    allWordsById.set(word.id, word);
  }
  const allWords = Array.from(allWordsById.values());

  const rankedWords = allWords.slice().sort((a, b) => {
    const aRank = a.frequency_rank ?? Number.MAX_SAFE_INTEGER;
    const bRank = b.frequency_rank ?? Number.MAX_SAFE_INTEGER;
    if (a.reading_level !== b.reading_level) {
      return a.reading_level - b.reading_level;
    }
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return a.text.localeCompare(b.text);
  });

  const levelBandByWordId = new Map<string, number>();
  for (let i = 0; i < rankedWords.length; i++) {
    const band = Math.min(
      20,
      Math.floor((i * 20) / Math.max(1, rankedWords.length)) + 1,
    );
    levelBandByWordId.set(rankedWords[i].id, band);
  }

  const filterWords = (words: SuggestionWord[]) => {
    return words.filter((word) => {
      if (hideUncommon && !isTopCommonWord(word)) {
        return false;
      }
      if (selectedBand === "all") return true;
      const band = levelBandByWordId.get(word.id);
      return (
        typeof band === "number" && band <= Number.parseInt(selectedBand, 10)
      );
    });
  };

  const filteredMastered = filterWords(masteredWords);
  const filteredWorking = filterWords(workingWords);
  const filteredStretch = filterWords(stretchWords);

  const bandAvailability = new Map<number, number>();
  for (const word of allWords) {
    if (hideUncommon && !isTopCommonWord(word)) {
      continue;
    }
    const band = levelBandByWordId.get(word.id);
    if (!band) continue;
    bandAvailability.set(band, (bandAvailability.get(band) ?? 0) + 1);
  }

  const paginate = (words: SuggestionWord[], page: number) => {
    const totalPages = Math.max(1, Math.ceil(words.length / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * perPage;
    return {
      page: safePage,
      totalPages,
      items: words.slice(start, start + perPage),
    };
  };

  const masteredSlice = paginate(filteredMastered, masteredPage);
  const workingSlice = paginate(filteredWorking, workingPage);
  const stretchSlice = paginate(filteredStretch, stretchPage);

  const hasAnySection =
    filteredMastered.length > 0 ||
    filteredWorking.length > 0 ||
    filteredStretch.length > 0;

  return (
    <>
      <section className="rounded-2xl border border-[#efc8ab] bg-[#fffdf8] p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="reading-level-filter"
              className="text-sm font-semibold uppercase tracking-wider text-[#5f4a37]"
            >
              Difficulty Band
            </label>
            <select
              id="reading-level-filter"
              value={selectedBand}
              onChange={(event) => handleBandChange(event.target.value)}
              className="rounded-lg border border-[#e8b795] bg-white px-3 py-2 text-sm text-[#2f2a26] focus:border-[#2d78c4] focus:outline-none"
            >
              <option value="all">All levels</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((band) => {
                const count = bandAvailability.get(band) ?? 0;
                return (
                  <option
                    key={band}
                    value={String(band)}
                    disabled={count === 0}
                  >
                    Level {band} {count === 0 ? "(no words)" : `(${count})`}
                  </option>
                );
              })}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-[#5f4a37]">
              <input
                type="checkbox"
                checked={hideUncommon}
                onChange={(event) =>
                  handleHideUncommonChange(event.target.checked)
                }
                className="h-4 w-4 rounded border-[#e8b795]"
              />
              Hide uncommon words (not in top 5000)
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((band) => {
              const count = bandAvailability.get(band) ?? 0;
              const disabled = count === 0;
              const active = selectedBand === String(band);
              return (
                <button
                  key={band}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleBandChange(String(band))}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    active
                      ? "border-[#2d78c4] bg-[#eaf4ff] text-[#2d5f8f]"
                      : "border-[#efc8ab] bg-white text-[#5f4a37]"
                  } ${disabled ? "cursor-not-allowed opacity-40 blur-[1px]" : "hover:bg-[#fff5eb]"}`}
                >
                  {band}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-[#7b6652]">
            Saved on this device for this child. Higher levels include words
            from earlier levels too. Bands with no matching words are blurred.
          </span>
        </div>
      </section>

      <WordSection
        title="Mastered Words"
        subtitle="Words built from your child's top phonemes that are already mastered."
        words={masteredSlice.items}
        tone="mastered"
      />
      {filteredMastered.length > perPage ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={masteredSlice.page <= 1}
            onClick={() => setMasteredPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-[#5f4a37]">
            Mastered page {masteredSlice.page} / {masteredSlice.totalPages}
          </span>
          <button
            type="button"
            disabled={masteredSlice.page >= masteredSlice.totalPages}
            onClick={() =>
              setMasteredPage((p) => Math.min(masteredSlice.totalPages, p + 1))
            }
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <WordSection
        title="Working On Words"
        subtitle="Words that include top phonemes your child is currently practicing."
        words={workingSlice.items}
        tone="working"
      />
      {filteredWorking.length > perPage ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={workingSlice.page <= 1}
            onClick={() => setWorkingPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-[#5f4a37]">
            Working page {workingSlice.page} / {workingSlice.totalPages}
          </span>
          <button
            type="button"
            disabled={workingSlice.page >= workingSlice.totalPages}
            onClick={() =>
              setWorkingPage((p) => Math.min(workingSlice.totalPages, p + 1))
            }
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <WordSection
        title="Stretch Words"
        subtitle="Next challenge words using top phonemes with little or no direct practice yet."
        words={stretchSlice.items}
        tone="stretch"
      />
      {filteredStretch.length > perPage ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={stretchSlice.page <= 1}
            onClick={() => setStretchPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-[#5f4a37]">
            Stretch page {stretchSlice.page} / {stretchSlice.totalPages}
          </span>
          <button
            type="button"
            disabled={stretchSlice.page >= stretchSlice.totalPages}
            onClick={() =>
              setStretchPage((p) => Math.min(stretchSlice.totalPages, p + 1))
            }
            className="rounded-md border border-[#efc8ab] bg-white px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {!hasAnySection ? (
        <section className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 text-sm text-[#7b6652] shadow-sm">
          No suggested words at the selected reading level. Raise the filter or
          continue scoring sounds.
        </section>
      ) : null}
    </>
  );
}

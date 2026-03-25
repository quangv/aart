import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SuggestionWord = {
  id: string;
  text: string;
  reading_level: number;
  part_of_speech: Database["public"]["Enums"]["part_of_speech"];
};

type RecommendationResult = {
  words: SuggestionWord[];
  phrases: string[];
  sentences: string[];
};

type PracticePlanWord = SuggestionWord & {
  matchedTopPhonemeCount: number;
};

type PracticePlanResult = {
  topPhonemes: {
    soundId: string;
    code: string;
    label: string;
    avgScore: number;
  }[];
  masteredWords: PracticePlanWord[];
  workingWords: PracticePlanWord[];
  stretchWords: PracticePlanWord[];
};

const positions: Database["public"]["Enums"]["sound_position"][] = [
  "beginning",
  "middle",
  "end",
];

function toTitleCase(text: string) {
  if (!text.length) return text;
  return text[0].toUpperCase() + text.slice(1);
}

export async function getRecommendationsForChild(
  supabase: SupabaseClient<Database>,
  childId: string,
): Promise<RecommendationResult> {
  const { data: masteredRows, error: masteredError } = await supabase
    .from("child_sound_progress")
    .select("position, sound_id")
    .eq("child_id", childId)
    .eq("mastered", true);

  if (masteredError) {
    throw masteredError;
  }

  const { data: sounds, error: soundsError } = await supabase
    .from("sounds")
    .select("id, code");

  if (soundsError) {
    throw soundsError;
  }

  const soundCodeById = new Map<string, string>();
  for (const sound of sounds ?? []) {
    soundCodeById.set(sound.id, sound.code);
  }

  const masteredSet = new Set<string>();
  for (const row of masteredRows ?? []) {
    const soundCode = soundCodeById.get(row.sound_id);
    if (soundCode) {
      masteredSet.add(`${soundCode}:${row.position}`);
    }
  }

  if (masteredSet.size === 0) {
    return { words: [], phrases: [], sentences: [] };
  }

  const { data: wordSoundRows, error: wordSoundError } = await supabase
    .from("word_sounds")
    .select("word_id, position, sequence_index, sound_id")
    .order("word_id")
    .order("sequence_index");

  if (wordSoundError) {
    throw wordSoundError;
  }

  const { data: wordRows, error: wordsError } = await supabase
    .from("words")
    .select("id, text, reading_level, part_of_speech");

  if (wordsError) {
    throw wordsError;
  }

  const wordById = new Map<string, SuggestionWord>();
  for (const word of wordRows ?? []) {
    wordById.set(word.id, word);
  }

  const byWord = new Map<
    string,
    {
      word: SuggestionWord;
      segments: {
        code: string;
        position: Database["public"]["Enums"]["sound_position"];
      }[];
    }
  >();

  for (const row of wordSoundRows ?? []) {
    const word = wordById.get(row.word_id);
    const soundCode = soundCodeById.get(row.sound_id);

    if (!word || !soundCode || !positions.includes(row.position)) {
      continue;
    }

    const existing = byWord.get(row.word_id);
    if (existing) {
      existing.segments.push({ code: soundCode, position: row.position });
      continue;
    }

    byWord.set(row.word_id, {
      word,
      segments: [{ code: soundCode, position: row.position }],
    });
  }

  const eligibleWords: SuggestionWord[] = [];
  for (const entry of byWord.values()) {
    const allMastered = entry.segments.every((segment) =>
      masteredSet.has(`${segment.code}:${segment.position}`),
    );

    if (allMastered) {
      eligibleWords.push(entry.word);
    }
  }

  eligibleWords.sort((a, b) => {
    if (a.reading_level !== b.reading_level) {
      return a.reading_level - b.reading_level;
    }
    return a.text.localeCompare(b.text);
  });

  const words = eligibleWords.slice(0, 24);
  const nouns = words.filter((word) => word.part_of_speech === "noun");
  const verbs = words.filter((word) => word.part_of_speech === "verb");
  const adjectives = words.filter(
    (word) => word.part_of_speech === "adjective",
  );

  const phrases: string[] = [];
  for (const adjective of adjectives.slice(0, 4)) {
    for (const noun of nouns.slice(0, 4)) {
      phrases.push(`${adjective.text} ${noun.text}`);
      if (phrases.length >= 8) {
        break;
      }
    }
    if (phrases.length >= 8) {
      break;
    }
  }

  if (phrases.length < 8) {
    for (const noun of nouns.slice(0, 8)) {
      phrases.push(`the ${noun.text}`);
      if (phrases.length >= 8) {
        break;
      }
    }
  }

  const sentences: string[] = [];
  for (const noun of nouns.slice(0, 6)) {
    for (const verb of verbs.slice(0, 6)) {
      sentences.push(`${toTitleCase(noun.text)} ${verb.text}s.`);
      if (sentences.length >= 8) {
        break;
      }
    }
    if (sentences.length >= 8) {
      break;
    }
  }

  if (sentences.length < 8) {
    for (const phrase of phrases.slice(0, 8 - sentences.length)) {
      sentences.push(`${toTitleCase(phrase)}.`);
    }
  }

  return {
    words,
    phrases: phrases.slice(0, 8),
    sentences: sentences.slice(0, 8),
  };
}

export async function getWordPracticePlanForChild(
  supabase: SupabaseClient<Database>,
  childId: string,
): Promise<PracticePlanResult> {
  const { data: sounds, error: soundsError } = await supabase
    .from("sounds")
    .select("id, code, label, ipa");

  if (soundsError) {
    throw soundsError;
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("child_sound_progress")
    .select("sound_id, position, score, attempts, mastered")
    .eq("child_id", childId);

  if (progressError) {
    throw progressError;
  }

  const { data: wordRows, error: wordsError } = await supabase
    .from("words")
    .select("id, text, reading_level, part_of_speech");

  if (wordsError) {
    throw wordsError;
  }

  const { data: wordSoundRows, error: wordSoundError } = await supabase
    .from("word_sounds")
    .select("word_id, sound_id, position, sequence_index")
    .order("word_id")
    .order("sequence_index");

  if (wordSoundError) {
    throw wordSoundError;
  }

  const progressByKey = new Map<
    string,
    { score: number; attempts: number; mastered: boolean }
  >();
  for (const row of progressRows ?? []) {
    progressByKey.set(`${row.sound_id}:${row.position}`, {
      score: row.score,
      attempts: row.attempts,
      mastered: row.mastered,
    });
  }

  const byWord = new Map<
    string,
    {
      word: SuggestionWord;
      segments: {
        soundId: string;
        position: Database["public"]["Enums"]["sound_position"];
      }[];
    }
  >();

  const wordById = new Map<string, SuggestionWord>();
  for (const word of wordRows ?? []) {
    wordById.set(word.id, word);
  }

  for (const row of wordSoundRows ?? []) {
    const word = wordById.get(row.word_id);
    if (!word || !positions.includes(row.position)) {
      continue;
    }

    const existing = byWord.get(row.word_id);
    if (existing) {
      existing.segments.push({ soundId: row.sound_id, position: row.position });
      continue;
    }

    byWord.set(row.word_id, {
      word,
      segments: [{ soundId: row.sound_id, position: row.position }],
    });
  }

  const topPhonemes = (sounds ?? [])
    .map((sound) => {
      const sum = positions.reduce((acc, position) => {
        const row = progressByKey.get(`${sound.id}:${position}`);
        return acc + (row?.score ?? 0);
      }, 0);
      const avgScore = sum / 3;
      const hasAnyProgress = positions.some((position) => {
        const row = progressByKey.get(`${sound.id}:${position}`);
        return Boolean(
          row && (row.mastered || row.score > 0 || row.attempts > 0),
        );
      });

      return {
        soundId: sound.id,
        code: sound.code,
        label: sound.ipa ?? sound.label ?? sound.code,
        avgScore,
        hasAnyProgress,
      };
    })
    .filter((item) => item.hasAnyProgress)
    .sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      return a.code.localeCompare(b.code);
    })
    .slice(0, 8)
    .map(({ hasAnyProgress, ...item }) => item);

  const topPhonemeSet = new Set(topPhonemes.map((item) => item.soundId));

  const masteredWords: PracticePlanWord[] = [];
  const workingWords: PracticePlanWord[] = [];
  const stretchWords: PracticePlanWord[] = [];

  for (const entry of byWord.values()) {
    const matchedTopPhonemeCount = entry.segments.filter((segment) =>
      topPhonemeSet.has(segment.soundId),
    ).length;

    if (matchedTopPhonemeCount === 0) {
      continue;
    }

    let masteredCount = 0;
    let workingCount = 0;

    for (const segment of entry.segments) {
      const row = progressByKey.get(`${segment.soundId}:${segment.position}`);
      if (!row) continue;
      if (row.mastered) {
        masteredCount += 1;
      } else if (row.score > 0 || row.attempts > 0) {
        workingCount += 1;
      }
    }

    const wordWithMeta: PracticePlanWord = {
      ...entry.word,
      matchedTopPhonemeCount,
    };

    if (masteredCount === entry.segments.length) {
      masteredWords.push(wordWithMeta);
      continue;
    }

    if (workingCount > 0 || masteredCount > 0) {
      workingWords.push(wordWithMeta);
      continue;
    }

    stretchWords.push(wordWithMeta);
  }

  const sorter = (a: PracticePlanWord, b: PracticePlanWord) => {
    if (b.matchedTopPhonemeCount !== a.matchedTopPhonemeCount) {
      return b.matchedTopPhonemeCount - a.matchedTopPhonemeCount;
    }
    if (a.reading_level !== b.reading_level) {
      return a.reading_level - b.reading_level;
    }
    return a.text.localeCompare(b.text);
  };

  masteredWords.sort(sorter);
  workingWords.sort(sorter);
  stretchWords.sort(sorter);

  return {
    topPhonemes,
    masteredWords: masteredWords.slice(0, 24),
    workingWords: workingWords.slice(0, 24),
    stretchWords: stretchWords.slice(0, 24),
  };
}

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

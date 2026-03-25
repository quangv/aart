#!/usr/bin/env node
"use strict";

/**
 * Generates a Supabase migration SQL file that adds Oxford 3000 core learner words
 * and Fry's first 1000 high-frequency words to the `words` + `word_sounds` tables.
 *
 * Pronunciations come from the CMU Pronouncing Dictionary (public domain).
 * ARPABET phonemes are mapped to the 39 IPA codes used by this app.
 *
 * Usage:
 *   node scripts/generate-word-migration.js > supabase/migrations/<timestamp>_seed_oxford3000_fry1000_words.sql
 */

const fs = require("fs");
const path = require("path");
const dict = require("cmu-pronouncing-dictionary").dictionary;
const OXFORD_3000_CSV_PATH = path.join(
  process.cwd(),
  "scripts",
  "data",
  "oxford3000.csv",
);

// ---------------------------------------------------------------------------
// ARPABET → app IPA code (the 39 phonemes in public.sounds)
// ---------------------------------------------------------------------------
function getIpaCode(arpa) {
  const m = arpa.match(/^([A-Z]+)([012]?)$/);
  if (!m) return null;
  const base = m[1];
  const stress = m[2];

  // AH: stressed (1,2) → /ʌ/, unstressed (0) → /ə/
  if (base === "AH") return stress === "0" ? "ə" : "ʌ";

  const MAP = {
    AE: "æ", // "cat"
    AA: "ɑ", // "father"
    AO: "o", // "thought" → approximate to /o/
    AW: "aʊ", // "cow"
    AY: "aɪ", // "fly"
    B: "b",
    CH: "ʧ",
    D: "d",
    DH: "ð",
    EH: "ɛ", // "bed"
    ER: "r", // rhoticized vowel → treat as /r/
    EY: "e", // "day"
    F: "f",
    G: "g",
    HH: "h",
    IH: "ɪ", // "big"
    IY: "i", // "tree"
    JH: "ʤ",
    K: "k",
    L: "l",
    M: "m",
    N: "n",
    NG: "ŋ",
    OW: "oʊ", // "go"
    OY: "ɔɪ", // "boy"
    P: "p",
    R: "r",
    S: "s",
    SH: "ʃ",
    T: "t",
    TH: "θ",
    UH: "ʊ", // "book"
    UW: "u", // "zoo"
    V: "v",
    W: "w",
    Y: "j",
    Z: "z",
    ZH: "ʒ",
  };
  return MAP[base] ?? null;
}

function countSyllables(phonemes) {
  return Math.max(1, phonemes.filter((p) => /[012]$/.test(p)).length);
}

function getWordData(word) {
  const pronunciation = dict[word.toLowerCase()];
  if (!pronunciation) return null;

  const phonemes = pronunciation.split(" ");
  const n = phonemes.length;
  const seen = new Map(); // "ipa:position" → {ipa, position}

  phonemes.forEach((arpa, i) => {
    const ipa = getIpaCode(arpa);
    if (!ipa) return;
    const position = i === 0 ? "beginning" : i === n - 1 ? "end" : "middle";
    const key = `${ipa}:${position}`;
    if (!seen.has(key)) seen.set(key, { ipa, position });
  });

  if (seen.size === 0) return null;

  return {
    syllables: countSyllables(phonemes),
    mappings: Array.from(seen.values()),
  };
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

function normalizePartOfSpeech(value) {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (!v) return "other";

  const alias = {
    n: "noun",
    noun: "noun",
    v: "verb",
    verb: "verb",
    adj: "adjective",
    adjective: "adjective",
    adv: "adverb",
    adverb: "adverb",
    pron: "pronoun",
    pronoun: "pronoun",
    prep: "preposition",
    preposition: "preposition",
    det: "determiner",
    determiner: "determiner",
    interj: "interjection",
    interjection: "interjection",
    conj: "conjunction",
    conjunction: "conjunction",
    other: "other",
  };

  // Keep the first token if a source has combined tags like "verb; noun".
  const head = v.split(/[;|/]/)[0].trim();
  return alias[head] || "other";
}

function cefrToReadingLevel(cefr) {
  const map = {
    A1: 1,
    A2: 2,
    B1: 3,
    B2: 4,
    C1: 5,
    C2: 6,
  };
  const key = String(cefr || "")
    .toUpperCase()
    .trim();
  return map[key] || null;
}

function inferReadingLevelFromWordDifficulty(word) {
  const w = String(word || "")
    .toLowerCase()
    .trim();
  if (!w) return 5;

  let levelByLength = 2;
  if (w.length <= 3) levelByLength = 1;
  else if (w.length <= 5) levelByLength = 2;
  else if (w.length <= 7) levelByLength = 3;
  else if (w.length <= 9) levelByLength = 4;
  else levelByLength = 5;

  // Prefer CMU syllable count when available; otherwise use rough vowel groups.
  const pronunciation = dict[w];
  const syllables = pronunciation
    ? pronunciation.split(" ").filter((p) => /[012]$/.test(p)).length
    : (w.match(/[aeiouy]+/g) || []).length;

  let levelBySyllables = 1;
  if (syllables >= 4) levelBySyllables = 5;
  else if (syllables === 3) levelBySyllables = 4;
  else if (syllables === 2) levelBySyllables = 2;

  return Math.max(levelByLength, levelBySyllables);
}

function loadOxford3000WordsFromCsv() {
  if (!fs.existsSync(OXFORD_3000_CSV_PATH)) {
    process.stderr.write(
      `Oxford CSV not found at ${OXFORD_3000_CSV_PATH}; using built-in list only.\n`,
    );
    return [];
  }

  const raw = fs.readFileSync(OXFORD_3000_CSV_PATH, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const wordIndex = header.indexOf("word");
  const cefrIndex = header.indexOf("cefr");
  const posIndex = header.indexOf("part_of_speech");

  if (wordIndex < 0 || cefrIndex < 0) {
    throw new Error(
      "Oxford CSV must include at least 'word' and 'cefr' columns.",
    );
  }

  const entries = [];
  let skipped = 0;
  let inferredLevelCount = 0;
  let bumpedByDifficultyCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const word = String(cols[wordIndex] || "")
      .toLowerCase()
      .trim();
    const cefrLevel = cefrToReadingLevel(cols[cefrIndex]);
    const difficultyFloor = inferReadingLevelFromWordDifficulty(word);
    const level =
      cefrLevel === null
        ? difficultyFloor
        : Math.max(cefrLevel, difficultyFloor);
    const pos = normalizePartOfSpeech(posIndex >= 0 ? cols[posIndex] : "other");

    if (!word) {
      skipped++;
      continue;
    }

    if (cefrLevel === null) {
      inferredLevelCount++;
    } else if (difficultyFloor > cefrLevel) {
      bumpedByDifficultyCount++;
    }

    // Skip phrase entries; this generator is for single-word targets.
    if (/\s/.test(word)) {
      skipped++;
      continue;
    }

    entries.push([word, pos, level]);
  }

  process.stderr.write(
    `Loaded ${entries.length} Oxford CSV entries (${skipped} skipped) from ${OXFORD_3000_CSV_PATH}.\n`,
  );
  process.stderr.write(
    `Oxford level normalization: ${inferredLevelCount} inferred (missing CEFR), ${bumpedByDifficultyCount} bumped by difficulty floor.\n`,
  );
  return entries;
}

// ---------------------------------------------------------------------------
// Word list: [word, part_of_speech, reading_level]
//
// Sources:
//   Fry First 1000:  reading levels 1 (1-100), 2 (101-300), 3 (301-600), 4 (601-1000)
//   Oxford 3000 A1:  reading level 1
//   Oxford 3000 A2:  reading level 2
//   Oxford 3000 B1:  reading level 3
//   Oxford 3000 B2:  reading level 4
//   Oxford 3000 C1:  reading level 5
//
// part_of_speech values: noun | verb | adjective | adverb | pronoun |
//   preposition | determiner | conjunction | interjection | other
// ---------------------------------------------------------------------------
const WORDS = [
  // ── Fry 1-100 (level 1) ─────────────────────────────────────────────────
  ["the", "determiner", 1],
  ["of", "preposition", 1],
  ["and", "conjunction", 1],
  ["a", "determiner", 1],
  ["to", "preposition", 1],
  ["in", "preposition", 1],
  ["is", "verb", 1],
  ["you", "pronoun", 1],
  ["that", "determiner", 1],
  ["it", "pronoun", 1],
  ["he", "pronoun", 1],
  ["was", "verb", 1],
  ["for", "preposition", 1],
  ["on", "preposition", 1],
  ["are", "verb", 1],
  ["as", "conjunction", 1],
  ["with", "preposition", 1],
  ["his", "determiner", 1],
  ["they", "pronoun", 1],
  ["at", "preposition", 1],
  ["be", "verb", 1],
  ["this", "determiner", 1],
  ["have", "verb", 1],
  ["from", "preposition", 1],
  ["or", "conjunction", 1],
  ["one", "other", 1],
  ["had", "verb", 1],
  ["by", "preposition", 1],
  ["word", "noun", 1],
  ["but", "conjunction", 1],
  ["not", "adverb", 1],
  ["what", "pronoun", 1],
  ["all", "determiner", 1],
  ["were", "verb", 1],
  ["we", "pronoun", 1],
  ["when", "adverb", 1],
  ["your", "determiner", 1],
  ["can", "verb", 1],
  ["said", "verb", 1],
  ["there", "adverb", 1],
  ["use", "verb", 1],
  ["an", "determiner", 1],
  ["each", "determiner", 1],
  ["which", "determiner", 1],
  ["she", "pronoun", 1],
  ["do", "verb", 1],
  ["how", "adverb", 1],
  ["their", "determiner", 1],
  ["if", "conjunction", 1],
  ["will", "verb", 1],
  ["up", "adverb", 1],
  ["other", "adjective", 1],
  ["about", "preposition", 1],
  ["out", "adverb", 1],
  ["many", "adjective", 1],
  ["then", "adverb", 1],
  ["them", "pronoun", 1],
  ["these", "determiner", 1],
  ["so", "adverb", 1],
  ["some", "determiner", 1],
  ["her", "determiner", 1],
  ["would", "verb", 1],
  ["make", "verb", 1],
  ["like", "verb", 1],
  ["him", "pronoun", 1],
  ["into", "preposition", 1],
  ["time", "noun", 1],
  ["has", "verb", 1],
  ["look", "verb", 1],
  ["two", "other", 1],
  ["more", "adjective", 1],
  ["write", "verb", 1],
  ["go", "verb", 1],
  ["see", "verb", 1],
  ["number", "noun", 1],
  ["no", "determiner", 1],
  ["way", "noun", 1],
  ["could", "verb", 1],
  ["people", "noun", 1],
  ["my", "determiner", 1],
  ["than", "conjunction", 1],
  ["first", "adjective", 1],
  ["water", "noun", 1],
  ["been", "verb", 1],
  ["call", "verb", 1],
  ["who", "pronoun", 1],
  ["oil", "noun", 1],
  ["its", "determiner", 1],
  ["now", "adverb", 1],
  ["find", "verb", 1],
  ["long", "adjective", 1],
  ["down", "adverb", 1],
  ["day", "noun", 1],
  ["did", "verb", 1],
  ["get", "verb", 1],
  ["come", "verb", 1],
  ["made", "verb", 1],
  ["may", "verb", 1],
  ["part", "noun", 1],

  // ── Fry 101-200 (level 2) ────────────────────────────────────────────────
  ["over", "adverb", 2],
  ["new", "adjective", 2],
  ["sound", "noun", 2],
  ["take", "verb", 2],
  ["only", "adverb", 2],
  ["little", "adjective", 2],
  ["work", "noun", 2],
  ["know", "verb", 2],
  ["place", "noun", 2],
  ["year", "noun", 2],
  ["live", "verb", 2],
  ["me", "pronoun", 2],
  ["back", "adverb", 2],
  ["give", "verb", 2],
  ["most", "adjective", 2],
  ["very", "adverb", 2],
  ["after", "preposition", 2],
  ["thing", "noun", 2],
  ["our", "determiner", 2],
  ["just", "adverb", 2],
  ["name", "noun", 2],
  ["good", "adjective", 2],
  ["sentence", "noun", 2],
  ["man", "noun", 2],
  ["think", "verb", 2],
  ["say", "verb", 2],
  ["great", "adjective", 2],
  ["where", "adverb", 2],
  ["help", "verb", 2],
  ["through", "preposition", 2],
  ["much", "adjective", 2],
  ["before", "preposition", 2],
  ["line", "noun", 2],
  ["right", "adjective", 2],
  ["too", "adverb", 2],
  ["mean", "verb", 2],
  ["old", "adjective", 2],
  ["any", "determiner", 2],
  ["same", "adjective", 2],
  ["tell", "verb", 2],
  ["boy", "noun", 2],
  ["follow", "verb", 2],
  ["came", "verb", 2],
  ["want", "verb", 2],
  ["show", "verb", 2],
  ["also", "adverb", 2],
  ["around", "preposition", 2],
  ["form", "noun", 2],
  ["three", "other", 2],
  ["small", "adjective", 2],
  ["set", "verb", 2],
  ["put", "verb", 2],
  ["end", "noun", 2],
  ["does", "verb", 2],
  ["another", "determiner", 2],
  ["well", "adverb", 2],
  ["large", "adjective", 2],
  ["must", "verb", 2],
  ["big", "adjective", 2],
  ["even", "adverb", 2],
  ["such", "determiner", 2],
  ["because", "conjunction", 2],
  ["turn", "verb", 2],
  ["here", "adverb", 2],
  ["why", "adverb", 2],
  ["ask", "verb", 2],
  ["went", "verb", 2],
  ["men", "noun", 2],
  ["read", "verb", 2],
  ["need", "verb", 2],
  ["land", "noun", 2],
  ["different", "adjective", 2],
  ["home", "noun", 2],
  ["us", "pronoun", 2],
  ["move", "verb", 2],
  ["try", "verb", 2],
  ["kind", "adjective", 2],
  ["hand", "noun", 2],
  ["picture", "noun", 2],
  ["again", "adverb", 2],
  ["change", "verb", 2],
  ["off", "adverb", 2],
  ["play", "verb", 2],
  ["spell", "verb", 2],
  ["air", "noun", 2],
  ["away", "adverb", 2],
  ["animal", "noun", 2],
  ["house", "noun", 2],
  ["point", "noun", 2],
  ["page", "noun", 2],
  ["letter", "noun", 2],
  ["mother", "noun", 2],
  ["answer", "verb", 2],
  ["found", "verb", 2],
  ["study", "verb", 2],
  ["still", "adverb", 2],
  ["learn", "verb", 2],
  ["should", "verb", 2],
  ["world", "noun", 2],

  // ── Fry 201-300 (level 2) ────────────────────────────────────────────────
  ["high", "adjective", 2],
  ["every", "determiner", 2],
  ["near", "adverb", 2],
  ["add", "verb", 2],
  ["food", "noun", 2],
  ["between", "preposition", 2],
  ["own", "adjective", 2],
  ["below", "adverb", 2],
  ["country", "noun", 2],
  ["plant", "noun", 2],
  ["last", "adjective", 2],
  ["school", "noun", 2],
  ["father", "noun", 2],
  ["keep", "verb", 2],
  ["tree", "noun", 2],
  ["never", "adverb", 2],
  ["start", "verb", 2],
  ["city", "noun", 2],
  ["earth", "noun", 2],
  ["eye", "noun", 2],
  ["light", "noun", 2],
  ["thought", "noun", 2],
  ["head", "noun", 2],
  ["under", "preposition", 2],
  ["story", "noun", 2],
  ["saw", "verb", 2],
  ["left", "adjective", 2],
  ["few", "adjective", 2],
  ["while", "conjunction", 2],
  ["along", "preposition", 2],
  ["might", "verb", 2],
  ["close", "verb", 2],
  ["something", "pronoun", 2],
  ["seem", "verb", 2],
  ["next", "adjective", 2],
  ["hard", "adjective", 2],
  ["open", "adjective", 2],
  ["example", "noun", 2],
  ["begin", "verb", 2],
  ["life", "noun", 2],
  ["always", "adverb", 2],
  ["those", "determiner", 2],
  ["both", "determiner", 2],
  ["paper", "noun", 2],
  ["together", "adverb", 2],
  ["group", "noun", 2],
  ["often", "adverb", 2],
  ["run", "verb", 2],
  ["important", "adjective", 2],
  ["until", "conjunction", 2],
  ["children", "noun", 2],
  ["side", "noun", 2],
  ["feet", "noun", 2],
  ["car", "noun", 2],
  ["mile", "noun", 2],
  ["night", "noun", 2],
  ["walk", "verb", 2],
  ["white", "adjective", 2],
  ["sea", "noun", 2],
  ["grow", "verb", 2],
  ["took", "verb", 2],
  ["river", "noun", 2],
  ["four", "other", 2],
  ["carry", "verb", 2],
  ["state", "noun", 2],
  ["once", "adverb", 2],
  ["book", "noun", 2],
  ["hear", "verb", 2],
  ["stop", "verb", 2],
  ["without", "preposition", 2],
  ["second", "adjective", 2],
  ["later", "adverb", 2],
  ["idea", "noun", 2],
  ["enough", "adverb", 2],
  ["eat", "verb", 2],
  ["face", "noun", 2],
  ["watch", "verb", 2],
  ["far", "adverb", 2],
  ["real", "adjective", 2],
  ["almost", "adverb", 2],
  ["let", "verb", 2],
  ["above", "preposition", 2],
  ["girl", "noun", 2],
  ["sometimes", "adverb", 2],
  ["mountain", "noun", 2],
  ["cut", "verb", 2],
  ["young", "adjective", 2],
  ["talk", "verb", 2],
  ["soon", "adverb", 2],
  ["list", "noun", 2],
  ["song", "noun", 2],
  ["leave", "verb", 2],
  ["family", "noun", 2],

  // ── Fry 301-400 (level 3) ────────────────────────────────────────────────
  ["body", "noun", 3],
  ["music", "noun", 3],
  ["color", "noun", 3],
  ["stand", "verb", 3],
  ["sun", "noun", 3],
  ["question", "noun", 3],
  ["fish", "noun", 3],
  ["area", "noun", 3],
  ["mark", "noun", 3],
  ["dog", "noun", 3],
  ["horse", "noun", 3],
  ["problem", "noun", 3],
  ["complete", "adjective", 3],
  ["room", "noun", 3],
  ["knew", "verb", 3],
  ["since", "conjunction", 3],
  ["ever", "adverb", 3],
  ["piece", "noun", 3],
  ["told", "verb", 3],
  ["usually", "adverb", 3],
  ["friend", "noun", 3],
  ["easy", "adjective", 3],
  ["heard", "verb", 3],
  ["order", "noun", 3],
  ["red", "adjective", 3],
  ["door", "noun", 3],
  ["sure", "adjective", 3],
  ["become", "verb", 3],
  ["top", "noun", 3],
  ["ship", "noun", 3],
  ["across", "preposition", 3],
  ["today", "adverb", 3],
  ["during", "preposition", 3],
  ["short", "adjective", 3],
  ["better", "adjective", 3],
  ["best", "adjective", 3],
  ["however", "adverb", 3],
  ["low", "adjective", 3],
  ["black", "adjective", 3],
  ["whole", "adjective", 3],
  ["measure", "verb", 3],
  ["early", "adjective", 3],
  ["reach", "verb", 3],
  ["listen", "verb", 3],
  ["wind", "noun", 3],
  ["rock", "noun", 3],
  ["space", "noun", 3],
  ["fast", "adjective", 3],
  ["several", "adjective", 3],
  ["hold", "verb", 3],
  ["himself", "pronoun", 3],
  ["toward", "preposition", 3],
  ["five", "other", 3],
  ["step", "noun", 3],
  ["morning", "noun", 3],
  ["vowel", "noun", 3],
  ["true", "adjective", 3],
  ["hundred", "other", 3],
  ["against", "preposition", 3],
  ["pattern", "noun", 3],
  ["table", "noun", 3],
  ["north", "noun", 3],
  ["slowly", "adverb", 3],
  ["money", "noun", 3],
  ["map", "noun", 3],
  ["farm", "noun", 3],
  ["draw", "verb", 3],
  ["voice", "noun", 3],
  ["seen", "verb", 3],
  ["cold", "adjective", 3],
  ["plan", "noun", 3],
  ["notice", "verb", 3],
  ["south", "noun", 3],
  ["sing", "verb", 3],
  ["war", "noun", 3],
  ["ground", "noun", 3],
  ["fall", "verb", 3],
  ["town", "noun", 3],
  ["figure", "noun", 3],
  ["certain", "adjective", 3],
  ["field", "noun", 3],
  ["travel", "verb", 3],
  ["wood", "noun", 3],
  ["fire", "noun", 3],

  // ── Fry 401-500 (level 3) ────────────────────────────────────────────────
  ["done", "verb", 3],
  ["road", "noun", 3],
  ["half", "adjective", 3],
  ["ten", "other", 3],
  ["fly", "verb", 3],
  ["box", "noun", 3],
  ["wait", "verb", 3],
  ["correct", "adjective", 3],
  ["quickly", "adverb", 3],
  ["person", "noun", 3],
  ["became", "verb", 3],
  ["strong", "adjective", 3],
  ["front", "noun", 3],
  ["feel", "verb", 3],
  ["fact", "noun", 3],
  ["street", "noun", 3],
  ["contain", "verb", 3],
  ["course", "noun", 3],
  ["surface", "noun", 3],
  ["produce", "verb", 3],
  ["building", "noun", 3],
  ["ocean", "noun", 3],
  ["class", "noun", 3],
  ["note", "noun", 3],
  ["nothing", "pronoun", 3],
  ["rest", "noun", 3],
  ["carefully", "adverb", 3],
  ["stay", "verb", 3],
  ["green", "adjective", 3],
  ["known", "verb", 3],
  ["island", "noun", 3],
  ["week", "noun", 3],
  ["less", "adjective", 3],
  ["base", "noun", 3],
  ["ago", "adverb", 3],
  ["plane", "noun", 3],
  ["system", "noun", 3],
  ["behind", "preposition", 3],
  ["round", "adjective", 3],
  ["boat", "noun", 3],
  ["game", "noun", 3],
  ["force", "noun", 3],
  ["brought", "verb", 3],
  ["understand", "verb", 3],
  ["warm", "adjective", 3],
  ["common", "adjective", 3],
  ["bring", "verb", 3],
  ["explain", "verb", 3],
  ["dry", "adjective", 3],
  ["language", "noun", 3],
  ["shape", "noun", 3],
  ["deep", "adjective", 3],
  ["yes", "interjection", 3],
  ["clear", "adjective", 3],
  ["yet", "adverb", 3],
  ["heat", "noun", 3],
  ["full", "adjective", 3],
  ["hot", "adjective", 3],
  ["check", "verb", 3],
  ["object", "noun", 3],
  ["rule", "noun", 3],
  ["among", "preposition", 3],
  ["power", "noun", 3],
  ["able", "adjective", 3],
  ["six", "other", 3],
  ["size", "noun", 3],
  ["dark", "adjective", 3],
  ["ball", "noun", 3],
  ["special", "adjective", 3],
  ["heavy", "adjective", 3],
  ["fine", "adjective", 3],
  ["include", "verb", 3],

  // ── Fry 501-600 (level 3) ────────────────────────────────────────────────
  ["matter", "noun", 3],
  ["perhaps", "adverb", 3],
  ["bill", "noun", 3],
  ["felt", "verb", 3],
  ["suddenly", "adverb", 3],
  ["test", "noun", 3],
  ["direction", "noun", 3],
  ["ready", "adjective", 3],
  ["anything", "pronoun", 3],
  ["simple", "adjective", 3],
  ["paint", "verb", 3],
  ["mind", "noun", 3],
  ["love", "noun", 3],
  ["cause", "noun", 3],
  ["rain", "noun", 3],
  ["exercise", "noun", 3],
  ["train", "noun", 3],
  ["blue", "adjective", 3],
  ["wish", "verb", 3],
  ["drop", "verb", 3],
  ["window", "noun", 3],
  ["difference", "noun", 3],
  ["distance", "noun", 3],
  ["heart", "noun", 3],
  ["sit", "verb", 3],
  ["summer", "noun", 3],
  ["wall", "noun", 3],
  ["forest", "noun", 3],
  ["probably", "adverb", 3],
  ["main", "adjective", 3],
  ["winter", "noun", 3],
  ["wide", "adjective", 3],
  ["reason", "noun", 3],
  ["kept", "verb", 3],
  ["interest", "noun", 3],
  ["brother", "noun", 3],
  ["race", "noun", 3],
  ["present", "adjective", 3],
  ["beautiful", "adjective", 3],
  ["store", "noun", 3],
  ["job", "noun", 3],
  ["edge", "noun", 3],
  ["past", "adjective", 3],
  ["sign", "noun", 3],
  ["record", "noun", 3],
  ["wild", "adjective", 3],
  ["happy", "adjective", 3],
  ["sky", "noun", 3],
  ["glass", "noun", 3],
  ["weather", "noun", 3],
  ["meet", "verb", 3],
  ["third", "adjective", 3],
  ["soft", "adjective", 3],
  ["clothes", "noun", 3],
  ["teacher", "noun", 3],
  ["describe", "verb", 3],
  ["drive", "verb", 3],

  // ── Fry 601-700 (level 4) ────────────────────────────────────────────────
  ["speak", "verb", 4],
  ["appear", "verb", 4],
  ["son", "noun", 4],
  ["ice", "noun", 4],
  ["sleep", "verb", 4],
  ["village", "noun", 4],
  ["result", "noun", 4],
  ["snow", "noun", 4],
  ["ride", "verb", 4],
  ["care", "verb", 4],
  ["floor", "noun", 4],
  ["hill", "noun", 4],
  ["baby", "noun", 4],
  ["buy", "verb", 4],
  ["century", "noun", 4],
  ["outside", "adverb", 4],
  ["tall", "adjective", 4],
  ["already", "adverb", 4],
  ["phrase", "noun", 4],
  ["soil", "noun", 4],
  ["bed", "noun", 4],
  ["copy", "verb", 4],
  ["free", "adjective", 4],
  ["hope", "verb", 4],
  ["spring", "noun", 4],
  ["case", "noun", 4],
  ["nation", "noun", 4],
  ["quite", "adverb", 4],
  ["type", "noun", 4],
  ["temperature", "noun", 4],
  ["bright", "adjective", 4],
  ["lead", "verb", 4],
  ["method", "noun", 4],
  ["section", "noun", 4],
  ["lake", "noun", 4],
  ["iron", "noun", 4],
  ["within", "preposition", 4],
  ["hair", "noun", 4],
  ["age", "noun", 4],
  ["amount", "noun", 4],
  ["although", "conjunction", 4],
  ["broken", "adjective", 4],
  ["moment", "noun", 4],
  ["tiny", "adjective", 4],
  ["possible", "adjective", 4],
  ["gold", "noun", 4],
  ["milk", "noun", 4],
  ["quiet", "adjective", 4],
  ["natural", "adjective", 4],
  ["lot", "noun", 4],
  ["stone", "noun", 4],
  ["act", "verb", 4],
  ["middle", "noun", 4],
  ["speed", "noun", 4],
  ["count", "verb", 4],
  ["cat", "noun", 4],
  ["bear", "noun", 4],
  ["wonder", "verb", 4],
  ["bottom", "noun", 4],
  ["trip", "noun", 4],
  ["hole", "noun", 4],
  ["poor", "adjective", 4],
  ["fight", "verb", 4],
  ["surprise", "noun", 4],
  ["beat", "verb", 4],
  ["exactly", "adverb", 4],
  ["dress", "noun", 4],

  // ── Fry 701-800 (level 4) ────────────────────────────────────────────────
  ["row", "noun", 4],
  ["least", "adjective", 4],
  ["catch", "verb", 4],
  ["wrote", "verb", 4],
  ["gas", "noun", 4],
  ["burn", "verb", 4],
  ["design", "noun", 4],
  ["foot", "noun", 4],
  ["law", "noun", 4],
  ["ear", "noun", 4],
  ["grass", "noun", 4],
  ["skin", "noun", 4],
  ["valley", "noun", 4],
  ["key", "noun", 4],
  ["brown", "adjective", 4],
  ["trouble", "noun", 4],
  ["cool", "adjective", 4],
  ["cloud", "noun", 4],
  ["lost", "adjective", 4],
  ["sent", "verb", 4],
  ["wear", "verb", 4],
  ["bad", "adjective", 4],
  ["save", "verb", 4],
  ["engine", "noun", 4],
  ["alone", "adjective", 4],
  ["pay", "verb", 4],
  ["single", "adjective", 4],
  ["touch", "verb", 4],
  ["mouth", "noun", 4],
  ["equal", "adjective", 4],
  ["control", "verb", 4],
  ["practice", "noun", 4],
  ["report", "noun", 4],
  ["straight", "adjective", 4],
  ["rise", "verb", 4],
  ["stick", "noun", 4],
  ["party", "noun", 4],
  ["suppose", "verb", 4],
  ["woman", "noun", 4],
  ["coast", "noun", 4],
  ["bank", "noun", 4],
  ["period", "noun", 4],
  ["clean", "adjective", 4],
  ["visit", "verb", 4],
  ["bit", "noun", 4],
  ["garden", "noun", 4],
  ["please", "verb", 4],
  ["strange", "adjective", 4],
  ["team", "noun", 4],
  ["ring", "noun", 4],
  ["serve", "verb", 4],
  ["child", "noun", 4],
  ["desert", "noun", 4],
  ["increase", "verb", 4],
  ["history", "noun", 4],
  ["cost", "noun", 4],
  ["business", "noun", 4],
  ["break", "verb", 4],
  ["uncle", "noun", 4],
  ["hunt", "verb", 4],
  ["flow", "verb", 4],
  ["human", "adjective", 4],
  ["art", "noun", 4],
  ["feeling", "noun", 4],

  // ── Fry 801-900 (level 4) ────────────────────────────────────────────────
  ["supply", "verb", 4],
  ["corner", "noun", 4],
  ["crop", "noun", 4],
  ["tone", "noun", 4],
  ["hit", "verb", 4],
  ["sand", "noun", 4],
  ["doctor", "noun", 4],
  ["provide", "verb", 4],
  ["cook", "verb", 4],
  ["bone", "noun", 4],
  ["tail", "noun", 4],
  ["board", "noun", 4],
  ["modern", "adjective", 4],
  ["fit", "adjective", 4],
  ["addition", "noun", 4],
  ["safe", "adjective", 4],
  ["guess", "verb", 4],
  ["silent", "adjective", 4],
  ["trade", "noun", 4],
  ["rather", "adverb", 4],
  ["compare", "verb", 4],
  ["crowd", "noun", 4],
  ["poem", "noun", 4],
  ["enjoy", "verb", 4],
  ["except", "preposition", 4],
  ["flat", "adjective", 4],
  ["seven", "other", 4],
  ["sense", "noun", 4],
  ["string", "noun", 4],
  ["blow", "verb", 4],
  ["famous", "adjective", 4],
  ["value", "noun", 4],
  ["wing", "noun", 4],
  ["movement", "noun", 4],
  ["thick", "adjective", 4],
  ["blood", "noun", 4],
  ["spot", "noun", 4],
  ["bell", "noun", 4],
  ["fun", "noun", 4],
  ["loud", "adjective", 4],
  ["consider", "verb", 4],
  ["thin", "adjective", 4],
  ["position", "noun", 4],
  ["fruit", "noun", 4],
  ["rich", "adjective", 4],
  ["send", "verb", 4],
  ["sight", "noun", 4],
  ["stream", "noun", 4],
  ["eight", "other", 4],
  ["science", "noun", 4],
  ["major", "adjective", 4],
  ["tube", "noun", 4],
  ["weight", "noun", 4],
  ["meat", "noun", 4],
  ["process", "noun", 4],
  ["hat", "noun", 4],
  ["swim", "verb", 4],
  ["park", "noun", 4],
  ["sell", "verb", 4],
  ["wash", "verb", 4],
  ["block", "noun", 4],
  ["wife", "noun", 4],
  ["sharp", "adjective", 4],

  // ── Fry 901-1000 (level 4) ───────────────────────────────────────────────
  ["radio", "noun", 4],
  ["capital", "noun", 4],
  ["yellow", "adjective", 4],
  ["ahead", "adverb", 4],
  ["chance", "noun", 4],
  ["born", "adjective", 4],
  ["level", "noun", 4],
  ["church", "noun", 4],
  ["sister", "noun", 4],
  ["opposite", "adjective", 4],
  ["wrong", "adjective", 4],
  ["chart", "noun", 4],
  ["pretty", "adjective", 4],
  ["solution", "noun", 4],
  ["fresh", "adjective", 4],
  ["shop", "noun", 4],
  ["nose", "noun", 4],
  ["afraid", "adjective", 4],
  ["dead", "adjective", 4],
  ["sugar", "noun", 4],
  ["office", "noun", 4],
  ["huge", "adjective", 4],
  ["gun", "noun", 4],
  ["similar", "adjective", 4],
  ["death", "noun", 4],
  ["score", "noun", 4],
  ["forward", "adverb", 4],
  ["experience", "noun", 4],
  ["rose", "noun", 4],
  ["allow", "verb", 4],
  ["fear", "noun", 4],
  ["march", "verb", 4],
  ["create", "verb", 4],
  ["difficult", "adjective", 4],
  ["match", "noun", 4],
  ["win", "verb", 4],
  ["total", "noun", 4],
  ["deal", "verb", 4],
  ["determine", "verb", 4],
  ["evening", "noun", 4],
  ["sudden", "adjective", 4],
  ["respect", "noun", 4],
  ["nine", "other", 4],
  ["pound", "noun", 4],
  ["term", "noun", 4],

  // ── Oxford 3000: A1 content words not yet in Fry above (level 1) ─────────
  ["address", "noun", 1],
  ["apple", "noun", 1],
  ["arrive", "verb", 1],
  ["bag", "noun", 1],
  ["bath", "noun", 1],
  ["beach", "noun", 1],
  ["bean", "noun", 1],
  ["bicycle", "noun", 1],
  ["bird", "noun", 1],
  ["birthday", "noun", 1],
  ["boot", "noun", 1],
  ["bottle", "noun", 1],
  ["bread", "noun", 1],
  ["bridge", "noun", 1],
  ["bus", "noun", 1],
  ["butter", "noun", 1],
  ["button", "noun", 1],
  ["cake", "noun", 1],
  ["camera", "noun", 1],
  ["candle", "noun", 1],
  ["chair", "noun", 1],
  ["cheese", "noun", 1],
  ["chicken", "noun", 1],
  ["chocolate", "noun", 1],
  ["circle", "noun", 1],
  ["coat", "noun", 1],
  ["coin", "noun", 1],
  ["cow", "noun", 1],
  ["cry", "verb", 1],
  ["cup", "noun", 1],
  ["dance", "verb", 1],
  ["daughter", "noun", 1],
  ["desk", "noun", 1],
  ["duck", "noun", 1],
  ["egg", "noun", 1],
  ["elephant", "noun", 1],
  ["envelope", "noun", 1],
  ["finger", "noun", 1],
  ["flag", "noun", 1],
  ["flower", "noun", 1],
  ["fork", "noun", 1],
  ["funny", "adjective", 1],
  ["gift", "noun", 1],
  ["glad", "adjective", 1],
  ["glove", "noun", 1],
  ["goat", "noun", 1],
  ["hungry", "adjective", 1],
  ["insect", "noun", 1],
  ["jacket", "noun", 1],
  ["jar", "noun", 1],
  ["jump", "verb", 1],
  ["kitchen", "noun", 1],
  ["kitten", "noun", 1],
  ["knife", "noun", 1],
  ["lamp", "noun", 1],
  ["laugh", "verb", 1],
  ["leaf", "noun", 1],
  ["lemon", "noun", 1],
  ["lunch", "noun", 1],
  ["mirror", "noun", 1],
  ["moon", "noun", 1],
  ["mouse", "noun", 1],
  ["neck", "noun", 1],
  ["nest", "noun", 1],
  ["nurse", "noun", 1],
  ["orange", "noun", 1],
  ["pen", "noun", 1],
  ["pencil", "noun", 1],
  ["phone", "noun", 1],
  ["pig", "noun", 1],
  ["pink", "adjective", 1],
  ["plate", "noun", 1],
  ["pond", "noun", 1],
  ["push", "verb", 1],
  ["quick", "adjective", 1],
  ["rabbit", "noun", 1],
  ["rainbow", "noun", 1],
  ["rice", "noun", 1],
  ["sad", "adjective", 1],
  ["salt", "noun", 1],
  ["sandwich", "noun", 1],
  ["sheep", "noun", 1],
  ["shirt", "noun", 1],
  ["shoe", "noun", 1],
  ["shout", "verb", 1],
  ["smile", "verb", 1],
  ["snake", "noun", 1],
  ["sock", "noun", 1],
  ["soup", "noun", 1],
  ["spider", "noun", 1],
  ["spoon", "noun", 1],
  ["star", "noun", 1],
  ["throw", "verb", 1],
  ["tiger", "noun", 1],
  ["tired", "adjective", 1],
  ["tomato", "noun", 1],
  ["tooth", "noun", 1],
  ["truck", "noun", 1],
  ["ugly", "adjective", 1],
  ["umbrella", "noun", 1],
  ["vegetable", "noun", 1],
  ["wave", "verb", 1],
  ["wolf", "noun", 1],
  ["zebra", "noun", 1],

  // ── Oxford 3000: A2 content words (level 2) ───────────────────────────────
  ["absent", "adjective", 2],
  ["accept", "verb", 2],
  ["accident", "noun", 2],
  ["achieve", "verb", 2],
  ["action", "noun", 2],
  ["active", "adjective", 2],
  ["activity", "noun", 2],
  ["actress", "noun", 2],
  ["adult", "noun", 2],
  ["adventure", "noun", 2],
  ["advice", "noun", 2],
  ["affect", "verb", 2],
  ["afford", "verb", 2],
  ["afternoon", "noun", 2],
  ["airport", "noun", 2],
  ["angry", "adjective", 2],
  ["announce", "verb", 2],
  ["awful", "adjective", 2],
  ["badge", "noun", 2],
  ["basic", "adjective", 2],
  ["basket", "noun", 2],
  ["believe", "verb", 2],
  ["belong", "verb", 2],
  ["beside", "preposition", 2],
  ["bite", "verb", 2],
  ["blank", "adjective", 2],
  ["boring", "adjective", 2],
  ["brave", "adjective", 2],
  ["breathe", "verb", 2],
  ["bunch", "noun", 2],
  ["busy", "adjective", 2],
  ["cage", "noun", 2],
  ["calm", "adjective", 2],
  ["capture", "verb", 2],
  ["careful", "adjective", 2],
  ["castle", "noun", 2],
  ["celebrate", "verb", 2],
  ["character", "noun", 2],
  ["cheap", "adjective", 2],
  ["choice", "noun", 2],
  ["choose", "verb", 2],
  ["cinema", "noun", 2],
  ["collect", "verb", 2],
  ["comfortable", "adjective", 2],
  ["connect", "verb", 2],
  ["cousin", "noun", 2],
  ["cover", "verb", 2],
  ["cream", "noun", 2],
  ["cruel", "adjective", 2],
  ["decide", "verb", 2],
  ["degree", "noun", 2],
  ["delay", "verb", 2],
  ["develop", "verb", 2],
  ["disappear", "verb", 2],
  ["discover", "verb", 2],
  ["divide", "verb", 2],
  ["dizzy", "adjective", 2],
  ["doubt", "noun", 2],
  ["education", "noun", 2],
  ["effort", "noun", 2],
  ["electricity", "noun", 2],
  ["emotion", "noun", 2],
  ["environment", "noun", 2],
  ["escape", "verb", 2],
  ["event", "noun", 2],
  ["excellent", "adjective", 2],
  ["exciting", "adjective", 2],
  ["expect", "verb", 2],
  ["expensive", "adjective", 2],
  ["fair", "adjective", 2],
  ["familiar", "adjective", 2],
  ["fantastic", "adjective", 2],
  ["favorite", "adjective", 2],
  ["finish", "verb", 2],
  ["fix", "verb", 2],
  ["flash", "noun", 2],
  ["freeze", "verb", 2],
  ["frightened", "adjective", 2],
  ["gentle", "adjective", 2],
  ["glasses", "noun", 2],
  ["glue", "noun", 2],
  ["guilty", "adjective", 2],
  ["happen", "verb", 2],
  ["healthy", "adjective", 2],
  ["hero", "noun", 2],
  ["honest", ["adjective"], 2],
  ["horrible", "adjective", 2],
  ["hotel", "noun", 2],
  ["hurt", "verb", 2],
  ["imagine", "verb", 2],
  ["improve", "verb", 2],
  ["information", "noun", 2],
  ["intelligent", "adjective", 2],
  ["invent", "verb", 2],
  ["invite", "verb", 2],
  ["jealous", "adjective", 2],
  ["journey", "noun", 2],
  ["jungle", "noun", 2],
  ["knock", "verb", 2],
  ["lazy", "adjective", 2],
  ["lonely", "adjective", 2],
  ["lucky", "adjective", 2],
  ["manage", "verb", 2],
  ["medicine", "noun", 2],
  ["message", "noun", 2],
  ["mistake", "noun", 2],
  ["mix", "verb", 2],
  ["museum", "noun", 2],
  ["narrow", "adjective", 2],
  ["neat", "adjective", 2],
  ["nervous", "adjective", 2],
  ["nice", "adjective", 2],
  ["noisy", "adjective", 2],
  ["offer", "verb", 2],
  ["opinion", "noun", 2],
  ["opportunity", "noun", 2],
  ["pain", "noun", 2],
  ["patient", "adjective", 2],
  ["perfect", "adjective", 2],
  ["permission", "noun", 2],
  ["police", "noun", 2],
  ["polite", "adjective", 2],
  ["popular", "adjective", 2],
  ["pour", "verb", 2],
  ["prefer", "verb", 2],
  ["prepare", "verb", 2],
  ["price", "noun", 2],
  ["promise", "verb", 2],
  ["protect", "verb", 2],
  ["proud", "adjective", 2],
  ["pull", "verb", 2],
  ["puzzle", "noun", 2],
  ["receive", "verb", 2],
  ["relax", "verb", 2],
  ["replace", "verb", 2],
  ["rescue", "verb", 2],
  ["reward", "noun", 2],
  ["rude", "adjective", 2],
  ["scared", "adjective", 2],
  ["search", "verb", 2],
  ["season", "noun", 2],
  ["serious", "adjective", 2],
  ["share", "verb", 2],
  ["sick", "adjective", 2],
  ["sleepy", "adjective", 2],
  ["smart", "adjective", 2],
  ["smell", "verb", 2],
  ["solve", "verb", 2],
  ["spend", "verb", 2],
  ["sport", "noun", 2],
  ["stairs", "noun", 2],
  ["subject", "noun", 2],
  ["success", "noun", 2],
  ["tackle", "verb", 2],
  ["theater", "noun", 2],
  ["tourist", "noun", 2],
  ["tray", "noun", 2],
  ["treasure", "noun", 2],
  ["upset", "adjective", 2],
  ["useful", "adjective", 2],
  ["vacation", "noun", 2],
  ["visitor", "noun", 2],
  ["waste", "verb", 2],
  ["weak", "adjective", 2],
  ["win", "verb", 2],
  ["wonderful", "adjective", 2],
  ["worried", "adjective", 2],

  // ── Oxford 3000: B1 content words (level 3) ───────────────────────────────
  ["ability", "noun", 3],
  ["abroad", "adverb", 3],
  ["absence", "noun", 3],
  ["absolutely", "adverb", 3],
  ["abuse", "noun", 3],
  ["access", "noun", 3],
  ["accompany", "verb", 3],
  ["account", "noun", 3],
  ["accurate", "adjective", 3],
  ["accuse", "verb", 3],
  ["admire", "verb", 3],
  ["admit", "verb", 3],
  ["adopt", "verb", 3],
  ["advance", "verb", 3],
  ["advantage", "noun", 3],
  ["agree", "verb", 3],
  ["agriculture", "noun", 3],
  ["aim", "noun", 3],
  ["alternative", "noun", 3],
  ["ancient", "adjective", 3],
  ["annoy", "verb", 3],
  ["anxious", "adjective", 3],
  ["appropriate", "adjective", 3],
  ["approve", "verb", 3],
  ["argue", "verb", 3],
  ["arrange", "verb", 3],
  ["arrest", "verb", 3],
  ["attitude", "noun", 3],
  ["attract", "verb", 3],
  ["available", "adjective", 3],
  ["avoid", "verb", 3],
  ["award", "noun", 3],
  ["background", "noun", 3],
  ["behaviour", "noun", 3],
  ["benefit", "noun", 3],
  ["broadcast", "verb", 3],
  ["budget", "noun", 3],
  ["campaign", "noun", 3],
  ["capable", "adjective", 3],
  ["category", "noun", 3],
  ["challenge", "noun", 3],
  ["citizen", "noun", 3],
  ["claim", "verb", 3],
  ["collapse", "verb", 3],
  ["colleague", "noun", 3],
  ["commit", "verb", 3],
  ["community", "noun", 3],
  ["compete", "verb", 3],
  ["complain", "verb", 3],
  ["complex", "adjective", 3],
  ["concentrate", "verb", 3],
  ["conclusion", "noun", 3],
  ["confident", "adjective", 3],
  ["confirm", "verb", 3],
  ["conflict", "noun", 3],
  ["confuse", "verb", 3],
  ["context", "noun", 3],
  ["contrast", "noun", 3],
  ["contribute", "verb", 3],
  ["convince", "verb", 3],
  ["crime", "noun", 3],
  ["culture", "noun", 3],
  ["custom", "noun", 3],
  ["damage", "verb", 3],
  ["decline", "verb", 3],
  ["defend", "verb", 3],
  ["demand", "noun", 3],
  ["detail", "noun", 3],
  ["discuss", "verb", 3],
  ["disease", "noun", 3],
  ["display", "verb", 3],
  ["distribute", "verb", 3],
  ["economy", "noun", 3],
  ["effective", "adjective", 3],
  ["election", "noun", 3],
  ["encourage", "verb", 3],
  ["energy", "noun", 3],
  ["enormous", "adjective", 3],
  ["equipment", "noun", 3],
  ["essential", "adjective", 3],
  ["evaluate", "verb", 3],
  ["evidence", "noun", 3],
  ["expand", "verb", 3],
  ["failure", "noun", 3],
  ["feature", "noun", 3],
  ["focus", "verb", 3],
  ["foreign", "adjective", 3],
  ["formal", "adjective", 3],
  ["freedom", "noun", 3],
  ["frequent", "adjective", 3],
  ["function", "noun", 3],
  ["global", "adjective", 3],
  ["growth", "noun", 3],
  ["ideal", "adjective", 3],
  ["identify", "verb", 3],
  ["ignore", "verb", 3],
  ["illegal", "adjective", 3],
  ["independence", "noun", 3],
  ["influence", "noun", 3],
  ["injury", "noun", 3],
  ["innocent", "adjective", 3],
  ["institution", "noun", 3],
  ["introduce", "verb", 3],
  ["involve", "verb", 3],
  ["issue", "noun", 3],
  ["judge", "verb", 3],
  ["knowledge", "noun", 3],
  ["leadership", "noun", 3],
  ["legal", "adjective", 3],
  ["mention", "verb", 3],
  ["military", "adjective", 3],
  ["negative", "adjective", 3],
  ["objective", "noun", 3],
  ["obvious", "adjective", 3],
  ["occasion", "noun", 3],
  ["original", "adjective", 3],
  ["participate", "verb", 3],
  ["penalty", "noun", 3],
  ["personal", "adjective", 3],
  ["persuade", "verb", 3],
  ["photograph", "noun", 3],
  ["policy", "noun", 3],
  ["political", "adjective", 3],
  ["predict", "verb", 3],
  ["previous", "adjective", 3],
  ["priority", "noun", 3],
  ["progress", "noun", 3],
  ["publish", "verb", 3],
  ["react", "verb", 3],
  ["recognize", "verb", 3],
  ["recommend", "verb", 3],
  ["refer", "verb", 3],
  ["region", "noun", 3],
  ["relationship", "noun", 3],
  ["release", "verb", 3],
  ["require", "verb", 3],
  ["research", "noun", 3],
  ["resolve", "verb", 3],
  ["risk", "noun", 3],
  ["role", "noun", 3],
  ["rural", "adjective", 3],
  ["select", "verb", 3],
  ["significant", "adjective", 3],
  ["situation", "noun", 3],
  ["skill", "noun", 3],
  ["society", "noun", 3],
  ["specific", "adjective", 3],
  ["statement", "noun", 3],
  ["stress", "noun", 3],
  ["structure", "noun", 3],
  ["suffer", "verb", 3],
  ["suggest", "verb", 3],
  ["support", "verb", 3],
  ["survey", "noun", 3],
  ["survive", "verb", 3],
  ["symbol", "noun", 3],
  ["traditional", "adjective", 3],
  ["trend", "noun", 3],
  ["typical", "adjective", 3],
  ["union", "noun", 3],
  ["urban", "adjective", 3],
  ["various", "adjective", 3],
  ["violence", "noun", 3],

  // ── Oxford 3000: B2 content words (level 4) ───────────────────────────────
  ["accomplish", "verb", 4],
  ["accurate", "adjective", 4],
  ["acquire", "verb", 4],
  ["adapt", "verb", 4],
  ["aggressive", "adjective", 4],
  ["allocate", "verb", 4],
  ["alter", "verb", 4],
  ["analyse", "verb", 4],
  ["anonymous", "adjective", 4],
  ["anticipate", "verb", 4],
  ["arbitrary", "adjective", 4],
  ["assess", "verb", 4],
  ["assume", "verb", 4],
  ["assumption", "noun", 4],
  ["awareness", "noun", 4],
  ["capable", "adjective", 4],
  ["circumstance", "noun", 4],
  ["clarify", "verb", 4],
  ["coherent", "adjective", 4],
  ["collaborate", "verb", 4],
  ["comprehensive", "adjective", 4],
  ["conclude", "verb", 4],
  ["consequence", "noun", 4],
  ["consistent", "adjective", 4],
  ["contemporary", "adjective", 4],
  ["contradict", "verb", 4],
  ["controversial", "adjective", 4],
  ["convention", "noun", 4],
  ["criticize", "verb", 4],
  ["deduce", "verb", 4],
  ["demonstrate", "verb", 4],
  ["deploy", "verb", 4],
  ["distinguish", "verb", 4],
  ["dominant", "adjective", 4],
  ["dramatic", "adjective", 4],
  ["elite", "noun", 4],
  ["emerge", "verb", 4],
  ["emphasize", "verb", 4],
  ["establish", "verb", 4],
  ["evolve", "verb", 4],
  ["execute", "verb", 4],
  ["explicit", "adjective", 4],
  ["expose", "verb", 4],
  ["flexible", "adjective", 4],
  ["framework", "noun", 4],
  ["fundamental", "adjective", 4],
  ["generate", "verb", 4],
  ["hypothesis", "noun", 4],
  ["implement", "verb", 4],
  ["indicate", "verb", 4],
  ["individual", "noun", 4],
  ["inevitable", "adjective", 4],
  ["initiative", "noun", 4],
  ["justify", "verb", 4],
  ["layer", "noun", 4],
  ["legitimate", "adjective", 4],
  ["maintain", "verb", 4],
  ["mechanism", "noun", 4],
  ["moderate", "adjective", 4],
  ["monitor", "verb", 4],
  ["mutual", "adjective", 4],
  ["obligation", "noun", 4],
  ["outcome", "noun", 4],
  ["overcome", "verb", 4],
  ["passive", "adjective", 4],
  ["perceive", "verb", 4],
  ["perspective", "noun", 4],
  ["phenomenon", "noun", 4],
  ["potential", "adjective", 4],
  ["precise", "adjective", 4],
  ["primitive", "adjective", 4],
  ["principle", "noun", 4],
  ["promote", "verb", 4],
  ["proportion", "noun", 4],
  ["radical", "adjective", 4],
  ["random", "adjective", 4],
  ["regulate", "verb", 4],
  ["reinforce", "verb", 4],
  ["relevant", "adjective", 4],
  ["reluctant", "adjective", 4],
  ["reveal", "verb", 4],
  ["source", "noun", 4],
  ["stable", "adjective", 4],
  ["strategy", "noun", 4],
  ["submit", "verb", 4],
  ["sufficient", "adjective", 4],
  ["summarize", "verb", 4],
  ["sustain", "verb", 4],
  ["technique", "noun", 4],
  ["transform", "verb", 4],
  ["unique", "adjective", 4],
  ["valid", "adjective", 4],
  ["variable", "noun", 4],

  // ── Oxford C1 (level 5) ───────────────────────────────────────────────────
  ["abolish", "verb", 5],
  ["abstract", "adjective", 5],
  ["accelerate", "verb", 5],
  ["accommodate", "verb", 5],
  ["accumulate", "verb", 5],
  ["acknowledge", "verb", 5],
  ["bias", "noun", 5],
  ["catalyst", "noun", 5],
  ["coherence", "noun", 5],
  ["compel", "verb", 5],
  ["comprehend", "verb", 5],
  ["conceive", "verb", 5],
  ["confine", "verb", 5],
  ["contradict", "verb", 5],
  ["dedicate", "verb", 5],
  ["deprecate", "verb", 5],
  ["differentiate", "verb", 5],
  ["dissolve", "verb", 5],
  ["elaborate", "verb", 5],
  ["envision", "verb", 5],
  ["fluctuate", "verb", 5],
  ["formulate", "verb", 5],
  ["fundamental", "adjective", 5],
  ["incentive", "noun", 5],
  ["incorporate", "verb", 5],
  ["inference", "noun", 5],
  ["integrate", "verb", 5],
  ["magnitude", "noun", 5],
  ["manifest", "verb", 5],
  ["minimize", "verb", 5],
  ["navigate", "verb", 5],
  ["negotiate", "verb", 5],
  ["paradigm", "noun", 5],
  ["perceive", "verb", 5],
  ["persist", "verb", 5],
  ["precedent", "noun", 5],
  ["predominant", "adjective", 5],
  ["prerequisite", "noun", 5],
  ["profound", "adjective", 5],
  ["reconcile", "verb", 5],
  ["reinforce", "verb", 5],
  ["resilience", "noun", 5],
  ["revise", "verb", 5],
  ["scrutinize", "verb", 5],
  ["simulate", "verb", 5],
  ["standardize", "verb", 5],
  ["synthesize", "verb", 5],
  ["transparent", "adjective", 5],
  ["undermine", "verb", 5],
  ["validate", "verb", 5],
  ["versatile", "adjective", 5],
];

// ---------------------------------------------------------------------------
// Dolch sight words (service words), pre-K through Grade 3.
// We map grade bands to reading levels:
//   pre-K -> 1, K -> 1, Grade 1 -> 2, Grade 2 -> 3, Grade 3 -> 4
// ---------------------------------------------------------------------------
const DOLCH_WORDS_BY_GRADE = {
  pre_k: [
    "a",
    "and",
    "away",
    "big",
    "blue",
    "can",
    "come",
    "down",
    "find",
    "for",
    "funny",
    "go",
    "help",
    "here",
    "i",
    "in",
    "is",
    "it",
    "jump",
    "little",
    "look",
    "make",
    "me",
    "my",
    "not",
    "one",
    "play",
    "red",
    "run",
    "said",
    "see",
    "the",
    "three",
    "to",
    "two",
    "up",
    "we",
    "where",
    "yellow",
    "you",
  ],
  k: [
    "all",
    "am",
    "are",
    "at",
    "ate",
    "be",
    "black",
    "brown",
    "but",
    "came",
    "did",
    "do",
    "eat",
    "four",
    "get",
    "good",
    "have",
    "he",
    "into",
    "like",
    "must",
    "new",
    "no",
    "now",
    "on",
    "our",
    "out",
    "please",
    "pretty",
    "ran",
    "ride",
    "saw",
    "say",
    "she",
    "so",
    "soon",
    "that",
    "there",
    "they",
    "this",
    "too",
    "under",
    "want",
    "was",
    "well",
    "went",
    "what",
    "white",
    "who",
    "will",
    "with",
    "yes",
  ],
  grade_1: [
    "after",
    "again",
    "an",
    "any",
    "as",
    "ask",
    "by",
    "could",
    "every",
    "fly",
    "from",
    "give",
    "going",
    "had",
    "has",
    "her",
    "him",
    "his",
    "how",
    "just",
    "know",
    "let",
    "live",
    "may",
    "of",
    "old",
    "once",
    "open",
    "over",
    "put",
    "round",
    "some",
    "stop",
    "take",
    "thank",
    "them",
    "then",
    "think",
    "walk",
    "were",
    "when",
  ],
  grade_2: [
    "always",
    "around",
    "because",
    "been",
    "before",
    "best",
    "both",
    "buy",
    "call",
    "cold",
    "does",
    "don't",
    "fast",
    "first",
    "five",
    "found",
    "gave",
    "goes",
    "green",
    "its",
    "made",
    "many",
    "off",
    "or",
    "pull",
    "read",
    "right",
    "sing",
    "sit",
    "sleep",
    "tell",
    "their",
    "these",
    "those",
    "upon",
    "us",
    "use",
    "very",
    "wash",
    "which",
    "why",
    "wish",
    "work",
    "would",
    "write",
    "your",
  ],
  grade_3: [
    "about",
    "better",
    "bring",
    "carry",
    "clean",
    "cut",
    "done",
    "draw",
    "drink",
    "eight",
    "fall",
    "far",
    "full",
    "got",
    "grow",
    "hold",
    "hot",
    "hurt",
    "if",
    "keep",
    "kind",
    "laugh",
    "light",
    "long",
    "much",
    "myself",
    "never",
    "only",
    "own",
    "pick",
    "seven",
    "shall",
    "show",
    "six",
    "small",
    "start",
    "ten",
    "today",
    "together",
    "try",
    "warm",
  ],
};

const DOLCH_READING_LEVEL = {
  pre_k: 1,
  k: 1,
  grade_1: 2,
  grade_2: 3,
  grade_3: 4,
};

const DOLCH_WORDS = Object.entries(DOLCH_WORDS_BY_GRADE).flatMap(
  ([grade, words]) =>
    words.map((word) => [word, "other", DOLCH_READING_LEVEL[grade]]),
);

const OXFORD_3000_WORDS = loadOxford3000WordsFromCsv();

const ALL_WORDS = [...WORDS, ...DOLCH_WORDS, ...OXFORD_3000_WORDS];

// ---------------------------------------------------------------------------
// Flatten nested arrays in part_of_speech (defensive)
// ---------------------------------------------------------------------------
const cleanedWords = ALL_WORDS.map(([word, pos, level]) => [
  word,
  Array.isArray(pos) ? pos[0] : pos,
  level,
]);

// ---------------------------------------------------------------------------
// Deduplicate: if the same word appears more than once, keep the entry with
// the lowest reading_level (and prefer a non-'other' part_of_speech).
// This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time".
// ---------------------------------------------------------------------------
const wordMap = new Map();
for (const [word, pos, level] of cleanedWords) {
  const key = word.toLowerCase();
  const existing = wordMap.get(key);
  if (!existing) {
    wordMap.set(key, [word, pos, level]);
  } else {
    const betterLevel = level < existing[2];
    const betterPos = pos !== "other" && existing[1] === "other";
    if (betterLevel || betterPos) {
      const chosenPos = betterPos ? pos : existing[1];
      const chosenLevel = betterLevel ? level : existing[2];
      wordMap.set(key, [existing[0], chosenPos, chosenLevel]);
    }
  }
}
const deduped = Array.from(wordMap.values());

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------
const valueRows = [];
let skipped = 0;
const skippedList = [];

for (let i = 0; i < deduped.length; i++) {
  const [word, pos, level] = deduped[i];
  const frequencyRank = i + 1;
  const data = getWordData(word);
  if (!data) {
    skipped++;
    skippedList.push(word);
    continue;
  }

  for (const { ipa, position } of data.mappings) {
    const esc = word.replace(/'/g, "''");
    valueRows.push(
      `    (${sq(esc)}, ${sq(pos)}, ${level}, ${frequencyRank}, ${data.syllables}, ${sq(ipa)}, ${sq(position)})`,
    );
  }
}

function sq(s) {
  return `'${s}'`;
}

const lines = [];
lines.push("-- =============================================================");
lines.push(
  "-- Oxford 3000 core learner words + Fry first 1000 high-frequency words",
);
lines.push("-- Pronunciations: CMU Pronouncing Dictionary (public domain)");
lines.push("-- Generated by: scripts/generate-word-migration.js");
lines.push("-- =============================================================");
lines.push("");
lines.push("begin;");
lines.push("");
lines.push(
  "with mappings (word_text, part_of_speech, reading_level, frequency_rank, syllables, sound_code, position) as (",
);
lines.push("  values");
lines.push(valueRows.join(",\n"));
lines.push("),");
lines.push("");
lines.push("upsert_words as (");
lines.push(
  "  insert into public.words (text, reading_level, part_of_speech, frequency_rank, syllables)",
);
lines.push("  select distinct");
lines.push("    m.word_text,");
lines.push("    m.reading_level::int,");
lines.push("    m.part_of_speech::public.part_of_speech,");
lines.push("    m.frequency_rank::int,");
lines.push("    m.syllables::int");
lines.push("  from mappings m");
lines.push("  on conflict (text) do update");
lines.push("    set");
lines.push(
  "      reading_level = least(public.words.reading_level, excluded.reading_level),",
);
lines.push(
  "      frequency_rank = least(coalesce(public.words.frequency_rank, excluded.frequency_rank), excluded.frequency_rank),",
);
lines.push("      part_of_speech = case");
lines.push(
  "        when excluded.part_of_speech <> 'other'::public.part_of_speech",
);
lines.push("        then excluded.part_of_speech");
lines.push("        else public.words.part_of_speech");
lines.push("      end");
lines.push("  returning id, text");
lines.push(")");
lines.push("");
lines.push(
  "-- Join through upsert_words (not public.words) so newly-inserted rows are visible.",
);
lines.push(
  "insert into public.word_sounds (word_id, sound_id, position, sequence_index)",
);
lines.push("select");
lines.push("  w.id,");
lines.push("  s.id,");
lines.push("  m.position::public.sound_position,");
lines.push("  0");
lines.push("from mappings m");
lines.push("join public.sounds   s on s.code = m.sound_code");
lines.push("join upsert_words    w on w.text  = m.word_text");
lines.push(
  "on conflict (word_id, sound_id, position, sequence_index) do nothing;",
);
lines.push("");
lines.push("commit;");

process.stdout.write(lines.join("\n") + "\n");

// Summary to stderr so it doesn't pollute the SQL output
process.stderr.write(
  `\nGenerated ${valueRows.length} word_sound rows for ${deduped.length - skipped} words.\n`,
);
process.stderr.write(`Skipped ${skipped} words not found in CMU dict:\n`);
process.stderr.write(skippedList.join(", ") + "\n");

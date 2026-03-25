declare module "popular-english-words" {
  export interface PopularEnglishWordsApi {
    getMostPopular(count: number): string[];
    getMostPopularFilter(
      count: number,
      test: (word: string) => boolean,
    ): string[];
    getMostPopularRegex(count: number, regex: RegExp): string[];
    getMostPopularLength(count: number, length: number): string[];
    getWordRank(word: string): number;
    getWordAtPosition(position: number): string;
    getWordCount(): number;
    getAll(): string[];
  }

  export const words: PopularEnglishWordsApi;
}

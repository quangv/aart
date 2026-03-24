export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Enums: {
      part_of_speech:
        | "noun"
        | "verb"
        | "adjective"
        | "adverb"
        | "pronoun"
        | "preposition"
        | "determiner"
        | "interjection"
        | "conjunction"
        | "other";
      sound_position: "beginning" | "middle" | "end";
    };
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          parent_id: string;
          name: string;
          birth_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          name: string;
          birth_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          name?: string;
          birth_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sounds: {
        Row: {
          id: string;
          code: string;
          ipa: string | null;
          label: string;
          stage_number: number;
          stage_name: string;
          stage_focus: string;
          stage_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          ipa?: string | null;
          label: string;
          stage_number?: number;
          stage_name?: string;
          stage_focus?: string;
          stage_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          ipa?: string | null;
          label?: string;
          stage_number?: number;
          stage_name?: string;
          stage_focus?: string;
          stage_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      words: {
        Row: {
          id: string;
          text: string;
          reading_level: number;
          part_of_speech: Database["public"]["Enums"]["part_of_speech"];
          syllables: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          reading_level?: number;
          part_of_speech?: Database["public"]["Enums"]["part_of_speech"];
          syllables?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          text?: string;
          reading_level?: number;
          part_of_speech?: Database["public"]["Enums"]["part_of_speech"];
          syllables?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      word_sounds: {
        Row: {
          id: number;
          word_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          sequence_index: number;
        };
        Insert: {
          id?: number;
          word_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          sequence_index?: number;
        };
        Update: {
          id?: number;
          word_id?: string;
          sound_id?: string;
          position?: Database["public"]["Enums"]["sound_position"];
          sequence_index?: number;
        };
        Relationships: [];
      };
      child_sound_progress_records: {
        Row: {
          id: number;
          child_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          score: number;
          notes: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          child_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          score: number;
          notes?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          child_id?: string;
          sound_id?: string;
          position?: Database["public"]["Enums"]["sound_position"];
          score?: number;
          notes?: string | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      child_sound_progress: {
        Row: {
          id: number;
          child_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          score: number;
          attempts: number;
          mastered: boolean;
          notes: string | null;
          last_practiced_at: string;
        };
        Insert: {
          id?: number;
          child_id: string;
          sound_id: string;
          position: Database["public"]["Enums"]["sound_position"];
          score?: number;
          attempts?: number;
          mastered?: boolean;
          notes?: string | null;
          last_practiced_at?: string;
        };
        Update: {
          id?: number;
          child_id?: string;
          sound_id?: string;
          position?: Database["public"]["Enums"]["sound_position"];
          score?: number;
          attempts?: number;
          mastered?: boolean;
          notes?: string | null;
          last_practiced_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          title: string
          raw_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          title?: string
          raw_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          title?: string
          raw_text?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      script_chunks: {
        Row: {
          id: string
          script_id: string
          chunk_order: number
          text: string
          word_count: number
          complexity_score: number
          emphasis_level: number
          estimated_duration: number
          created_at: string
        }
        Insert: {
          id?: string
          script_id: string
          chunk_order: number
          text: string
          word_count?: number
          complexity_score?: number
          emphasis_level?: number
          estimated_duration?: number
          created_at?: string
        }
        Update: {
          id?: string
          script_id?: string
          chunk_order?: number
          text?: string
          word_count?: number
          complexity_score?: number
          emphasis_level?: number
          estimated_duration?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_chunks_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          }
        ]
      }
      teleprompter_settings: {
        Row: {
          id: string
          user_id: string
          font_size: number
          speed_multiplier: number
          default_wpm: number
          mode: string
          theme: string
          mirror_mode: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          font_size?: number
          speed_multiplier?: number
          default_wpm?: number
          mode?: string
          theme?: string
          mirror_mode?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          font_size?: number
          speed_multiplier?: number
          default_wpm?: number
          mode?: string
          theme?: string
          mirror_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

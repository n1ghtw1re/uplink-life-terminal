export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          callsign: string
          display_name: string | null
          custom_class_name: string | null
          theme: string
          current_layout: string
          bootstrap_complete: boolean
          created_at: string
          last_seen: string
        }
        Insert: {
          id: string
          callsign?: string
          display_name?: string | null
          custom_class_name?: string | null
          theme?: string
          current_layout?: string
          bootstrap_complete?: boolean
          created_at?: string
          last_seen?: string
        }
        Update: {
          id?: string
          callsign?: string
          display_name?: string | null
          custom_class_name?: string | null
          theme?: string
          current_layout?: string
          bootstrap_complete?: boolean
          created_at?: string
          last_seen?: string
        }
        Relationships: []
      }
      lifepath: {
        Row: {
          user_id: string
          origin: string | null
          personal_code: string | null
          life_goal: string | null
          current_focus: string | null
          root_access_meaning: string | null
          before_the_uplink: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          origin?: string | null
          personal_code?: string | null
          life_goal?: string | null
          current_focus?: string | null
          root_access_meaning?: string | null
          before_the_uplink?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          origin?: string | null
          personal_code?: string | null
          life_goal?: string | null
          current_focus?: string | null
          root_access_meaning?: string | null
          before_the_uplink?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifepath_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      master_progress: {
        Row: {
          user_id: string
          total_xp: number
          level: number
          streak: number
          shields: number
          last_checkin_date: string | null
          augmentation_score: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_xp?: number
          level?: number
          streak?: number
          shields?: number
          last_checkin_date?: string | null
          augmentation_score?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_xp?: number
          level?: number
          streak?: number
          shields?: number
          last_checkin_date?: string | null
          augmentation_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stats: {
        Row: {
          id: string
          user_id: string
          stat_key: string
          level: number
          xp: number
          streak: number
          last_active_date: string | null
          dormant: boolean
        }
        Insert: {
          id?: string
          user_id: string
          stat_key: string
          level?: number
          xp?: number
          streak?: number
          last_active_date?: string | null
          dormant?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          stat_key?: string
          level?: number
          xp?: number
          streak?: number
          last_active_date?: string | null
          dormant?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      skills: {
        Row: {
          id: string
          user_id: string
          name: string
          stat_keys: string[]
          default_split: number[]
          icon: string
          level: number
          xp: number
          xp_to_next: number
          is_template: boolean
          is_legacy: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          stat_keys: string[]
          default_split: number[]
          icon?: string
          level?: number
          xp?: number
          xp_to_next?: number
          is_template?: boolean
          is_legacy?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          stat_keys?: string[]
          default_split?: number[]
          icon?: string
          level?: number
          xp?: number
          xp_to_next?: number
          is_template?: boolean
          is_legacy?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      log_fields: {
        Row: {
          id: string
          skill_id: string
          user_id: string
          type: string
          label: string
          options: string[] | null
          sort_order: number
        }
        Insert: {
          id?: string
          skill_id: string
          user_id: string
          type: string
          label: string
          options?: string[] | null
          sort_order?: number
        }
        Update: {
          id?: string
          skill_id?: string
          user_id?: string
          type?: string
          label?: string
          options?: string[] | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "log_fields_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_fields_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          skill_id: string
          skill_name: string
          duration_minutes: number
          stat_split: Json
          field_values: Json | null
          notes: string | null
          is_legacy: boolean
          logged_at: string
          created_at: string
          skill_xp_awarded: number
          stat_xp_awarded: Json
          master_xp_awarded: number
          multiplier_applied: number
        }
        Insert: {
          id?: string
          user_id: string
          skill_id: string
          skill_name: string
          duration_minutes?: number
          stat_split: Json
          field_values?: Json | null
          notes?: string | null
          is_legacy?: boolean
          logged_at?: string
          created_at?: string
          skill_xp_awarded?: number
          stat_xp_awarded?: Json
          master_xp_awarded?: number
          multiplier_applied?: number
        }
        Update: {
          id?: string
          user_id?: string
          skill_id?: string
          skill_name?: string
          duration_minutes?: number
          stat_split?: Json
          field_values?: Json | null
          notes?: string | null
          is_legacy?: boolean
          logged_at?: string
          created_at?: string
          skill_xp_awarded?: number
          stat_xp_awarded?: Json
          master_xp_awarded?: number
          multiplier_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          }
        ]
      }
      xp_log: {
        Row: {
          id: string
          user_id: string
          source: string
          source_id: string | null
          tier: string
          amount: number
          base_amount: number
          multiplier: number
          stat_key: string | null
          skill_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source: string
          source_id?: string | null
          tier: string
          amount: number
          base_amount: number
          multiplier?: number
          stat_key?: string | null
          skill_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source?: string
          source_id?: string | null
          tier?: string
          amount?: number
          base_amount?: number
          multiplier?: number
          stat_key?: string | null
          skill_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          date: string
          stats_checked: string[]
          habits_checked: string[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          stats_checked?: string[]
          habits_checked?: string[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          stats_checked?: string[]
          habits_checked?: string[]
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          frequency: string
          days_of_week: number[] | null
          streak: number
          shields: number
          last_completed_date: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          frequency?: string
          days_of_week?: number[] | null
          streak?: number
          shields?: number
          last_completed_date?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          frequency?: string
          days_of_week?: number[] | null
          streak?: number
          shields?: number
          last_completed_date?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      habit_logs: {
        Row: {
          id: string
          user_id: string
          habit_id: string
          date: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id: string
          date: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit_id?: string
          date?: string
          completed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          user_id: string
          tier: string
          parent_id: string | null
          title: string
          description: string | null
          deadline: string | null
          linked_skill_ids: string[]
          linked_project_ids: string[]
          linked_course_ids: string[]
          progress_percent: number
          completed_at: string | null
          completion_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          parent_id?: string | null
          title: string
          description?: string | null
          deadline?: string | null
          linked_skill_ids?: string[]
          linked_project_ids?: string[]
          linked_course_ids?: string[]
          progress_percent?: number
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          parent_id?: string | null
          title?: string
          description?: string | null
          deadline?: string | null
          linked_skill_ids?: string[]
          linked_project_ids?: string[]
          linked_course_ids?: string[]
          progress_percent?: number
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      milestones: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          title: string
          xp_reward: number
          completed_at: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          title: string
          xp_reward?: number
          completed_at?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          title?: string
          xp_reward?: number
          completed_at?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          user_id: string
          name: string
          provider: string | null
          subject: string | null
          linked_stats: string[]
          linked_skill_ids: string[]
          status: string
          progress: number
          cert_earned: boolean
          url: string | null
          notes: string | null
          is_legacy: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          provider?: string | null
          subject?: string | null
          linked_stats?: string[]
          linked_skill_ids?: string[]
          status?: string
          progress?: number
          cert_earned?: boolean
          url?: string | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          provider?: string | null
          subject?: string | null
          linked_stats?: string[]
          linked_skill_ids?: string[]
          status?: string
          progress?: number
          cert_earned?: boolean
          url?: string | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      course_sections: {
        Row: {
          id: string
          course_id: string
          title: string
          sort_order: number
          completed_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          sort_order?: number
          completed_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          sort_order?: number
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      course_lessons: {
        Row: {
          id: string
          section_id: string
          course_id: string
          title: string
          type: string
          sort_order: number
          completed_at: string | null
          score: number | null
          passed: boolean | null
        }
        Insert: {
          id?: string
          section_id: string
          course_id: string
          title: string
          type?: string
          sort_order?: number
          completed_at?: string | null
          score?: number | null
          passed?: boolean | null
        }
        Update: {
          id?: string
          section_id?: string
          course_id?: string
          title?: string
          type?: string
          sort_order?: number
          completed_at?: string | null
          score?: number | null
          passed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          }
        ]
      }
      media: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          creator: string | null
          year: number | null
          status: string
          linked_stat: string | null
          linked_skill_ids: string[]
          rating: number | null
          notes: string | null
          is_legacy: boolean
          completed_at: string | null
          meta: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          creator?: string | null
          year?: number | null
          status?: string
          linked_stat?: string | null
          linked_skill_ids?: string[]
          rating?: number | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          meta?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          creator?: string | null
          year?: number | null
          status?: string
          linked_stat?: string | null
          linked_skill_ids?: string[]
          rating?: number | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          meta?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          status: string
          description: string | null
          linked_skill_ids: string[]
          progress: number
          url: string | null
          notes: string | null
          is_legacy: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string
          status?: string
          description?: string | null
          linked_skill_ids?: string[]
          progress?: number
          url?: string | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          status?: string
          description?: string | null
          linked_skill_ids?: string[]
          progress?: number
          url?: string | null
          notes?: string | null
          is_legacy?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_milestones: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string
          xp_reward: number
          completed_at: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          title: string
          xp_reward?: number
          completed_at?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          title?: string
          xp_reward?: number
          completed_at?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      certifications: {
        Row: {
          id: string
          user_id: string
          name: string
          issuer: string | null
          linked_stat: string | null
          linked_skill_ids: string[]
          earned_at: string | null
          expires_at: string | null
          credential_id: string | null
          credential_url: string | null
          from_course_id: string | null
          notes: string | null
          is_legacy: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          issuer?: string | null
          linked_stat?: string | null
          linked_skill_ids?: string[]
          earned_at?: string | null
          expires_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          from_course_id?: string | null
          notes?: string | null
          is_legacy?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          issuer?: string | null
          linked_stat?: string | null
          linked_skill_ids?: string[]
          earned_at?: string | null
          expires_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          from_course_id?: string | null
          notes?: string | null
          is_legacy?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tools: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          category: string | null
          linked_stat: string | null
          status: string
          url: string | null
          cost: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string
          category?: string | null
          linked_stat?: string | null
          status?: string
          url?: string | null
          cost?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          category?: string | null
          linked_stat?: string | null
          status?: string
          url?: string | null
          cost?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      augmentations: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          proficiency: number
          use_case: string | null
          linked_skill_ids: string[]
          status: string
          last_used_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          proficiency?: number
          use_case?: string | null
          linked_skill_ids?: string[]
          status?: string
          last_used_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string | null
          proficiency?: number
          use_case?: string | null
          linked_skill_ids?: string[]
          status?: string
          last_used_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "augmentations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      resources: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string
          type: string
          tags: string[]
          linked_skill_ids: string[]
          status: string
          notes: string | null
          is_legacy: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          url: string
          type?: string
          tags?: string[]
          linked_skill_ids?: string[]
          status?: string
          notes?: string | null
          is_legacy?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          url?: string
          type?: string
          tags?: string[]
          linked_skill_ids?: string[]
          status?: string
          notes?: string | null
          is_legacy?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      socials: {
        Row: {
          id: string
          user_id: string
          platform: string
          username: string
          url: string | null
          status: string
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          username: string
          url?: string | null
          status?: string
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          username?: string
          url?: string | null
          status?: string
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "socials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          content: string
          linked_type: string | null
          linked_id: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          linked_type?: string | null
          linked_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          linked_type?: string | null
          linked_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_key: string
          earned_at: string
          shield_awarded: boolean
        }
        Insert: {
          id?: string
          user_id: string
          badge_key: string
          earned_at?: string
          shield_awarded?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          badge_key?: string
          earned_at?: string
          shield_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      weekly_challenges: {
        Row: {
          id: string
          user_id: string
          week_start: string
          description: string
          target: number
          current: number
          completed: boolean
          xp_reward: number
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          description: string
          target: number
          current?: number
          completed?: boolean
          xp_reward?: number
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          description?: string
          target?: number
          current?: number
          completed?: boolean
          xp_reward?: number
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_skill_xp: {
        Args: { p_skill_id: string; p_amount: number }
        Returns: undefined
      }
      increment_stat_xp: {
        Args: { p_user_id: string; p_stat_key: string; p_amount: number }
        Returns: undefined
      }
      increment_master_xp: {
        Args: { p_user_id: string; p_amount: number }
        Returns: undefined
      }
      update_master_streak: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      init_user_data: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
/** Generated from the live Supabase public schema. Regenerate with `npm run db:types` (requires linked Supabase project). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_summaries: {
        Row: {
          report_id: string
          branch_id: string | null
          summary: string
          generated_at: string
        }
        Insert: {
          report_id: string
          branch_id?: string | null
          summary: string
          generated_at?: string
        }
        Update: {
          report_id?: string
          branch_id?: string | null
          summary?: string
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_report_id_fkey",
            columns: ["report_id"],
            isOneToOne: false,
            referencedRelation: "reports",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "ai_summaries_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          }
        ]
      }
      analytics_insight_cache: {
        Row: {
          id: string
          insight_date: string
          scope: string
          branch_id: string | null
          insight: string
          generated_at: string
        }
        Insert: {
          id?: string
          insight_date: string
          scope: string
          branch_id?: string | null
          insight: string
          generated_at?: string
        }
        Update: {
          id?: string
          insight_date?: string
          scope?: string
          branch_id?: string | null
          insight?: string
          generated_at?: string
        }
        Relationships: []
      }
      branch_channel_reads: {
        Row: {
          user_id: string
          channel_id: string
          last_read_at: string
        }
        Insert: {
          user_id: string
          channel_id: string
          last_read_at?: string
        }
        Update: {
          user_id?: string
          channel_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_channel_reads_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "branch_channel_reads_channel_id_fkey",
            columns: ["channel_id"],
            isOneToOne: false,
            referencedRelation: "branch_channels",
            referencedColumns: ["id"],
          }
        ]
      }
      branch_channels: {
        Row: {
          id: string
          branch_id: string
          slug: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          slug: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          slug?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_channels_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          }
        ]
      }
      branch_messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_messages_channel_id_fkey",
            columns: ["channel_id"],
            isOneToOne: false,
            referencedRelation: "branch_channels",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "branch_messages_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      branch_incident_tokens: {
        Row: {
          branch_id: string
          token: string
          template_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          token: string
          template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          token?: string
          template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_incident_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_incident_tokens_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "company_form_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_ops_daily_completions: {
        Row: {
          id: string
          daily_item_id: string
          work_date: string
          staff_member_id: string | null
          completed_at: string
        }
        Insert: {
          id?: string
          daily_item_id: string
          work_date: string
          staff_member_id?: string | null
          completed_at?: string
        }
        Update: {
          id?: string
          daily_item_id?: string
          work_date?: string
          staff_member_id?: string | null
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ops_daily_completions_daily_item_id_fkey"
            columns: ["daily_item_id"]
            isOneToOne: false
            referencedRelation: "branch_ops_daily_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ops_daily_completions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_ops_daily_items: {
        Row: {
          id: string
          table_id: string
          label: string
          time_hint: string | null
          time_group: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          label: string
          time_hint?: string | null
          time_group?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          label?: string
          time_hint?: string | null
          time_group?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ops_daily_items_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "branch_ops_tables"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_ops_rows: {
        Row: {
          id: string
          table_id: string
          branch_id: string
          work_date: string
          data: Json
          staff_member_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          branch_id: string
          work_date?: string
          data?: Json
          staff_member_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          branch_id?: string
          work_date?: string
          data?: Json
          staff_member_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ops_rows_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "branch_ops_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ops_rows_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ops_rows_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_ops_tables: {
        Row: {
          id: string
          branch_id: string
          name: string
          table_type: string
          columns: Json
          sort_order: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          name: string
          table_type: string
          columns?: Json
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          name?: string
          table_type?: string
          columns?: Json
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ops_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ops_tables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_ops_tokens: {
        Row: {
          branch_id: string
          token: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          token: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          token?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ops_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_issues: {
        Row: {
          id: string
          branch_id: string
          kind: string
          title: string
          stages: Json
          current_stage: number
          status: string
          cost_estimate: number | null
          notes: string | null
          stage_notes: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          kind: string
          title: string
          stages?: Json
          current_stage?: number
          status?: string
          cost_estimate?: number | null
          notes?: string | null
          stage_notes?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          kind?: string
          title?: string
          stages?: Json
          current_stage?: number
          status?: string
          cost_estimate?: number | null
          notes?: string | null
          stage_notes?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_issues_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      branch_review_explanations: {
        Row: {
          id: string
          branch_id: string
          review_signature: string
          author_name: string
          rating: number
          review_text: string
          explanation: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          review_signature: string
          author_name: string
          rating: number
          review_text: string
          explanation?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          review_signature?: string
          author_name?: string
          rating?: number
          review_text?: string
          explanation?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_review_explanations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_review_explanations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      branches: {
        Row: {
          id: string
          name: string
          location: string | null
          external_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          google_maps_url: string | null
          google_place_id: string | null
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          external_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          google_maps_url?: string | null
          google_place_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          external_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          google_maps_url?: string | null
          google_place_id?: string | null
        }
        Relationships: []
      }
      fruhstuck_data: {
        Row: {
          id: string
          branch_id: string
          date: string
          orders_count: number
          revenue: number
          top_item: string | null
          items: Json
          raw_data: Json | null
          synced_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          date: string
          orders_count?: number
          revenue?: number
          top_item?: string | null
          items: Json
          raw_data?: Json | null
          synced_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          date?: string
          orders_count?: number
          revenue?: number
          top_item?: string | null
          items?: Json
          raw_data?: Json | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fruhstuck_data_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          }
        ]
      }
      hub_channel_reads: {
        Row: {
          user_id: string
          channel_id: string
          last_read_at: string
        }
        Insert: {
          user_id: string
          channel_id: string
          last_read_at?: string
        }
        Update: {
          user_id?: string
          channel_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_channel_reads_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "hub_channel_reads_channel_id_fkey",
            columns: ["channel_id"],
            isOneToOne: false,
            referencedRelation: "hub_channels",
            referencedColumns: ["id"],
          }
        ]
      }
      hub_channels: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          visible_roles: string[]
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          visible_roles: string[]
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          visible_roles?: string[]
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_channels_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      hub_messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_messages_channel_id_fkey",
            columns: ["channel_id"],
            isOneToOne: false,
            referencedRelation: "hub_channels",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "hub_messages_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      ki_chat_history: {
        Row: {
          id: string
          user_id: string
          role: string
          content: string
          context_mode: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          content: string
          context_mode?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          content?: string
          context_mode?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ki_chat_history_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      kpis: {
        Row: {
          id: string
          branch_id: string
          report_id: string
          period_start: string
          period_end: string
          revenue: number | null
          occupancy_rate: number | null
          negative_feedback: number | null
          positive_feedback: number | null
          unpaid_departures: number | null
          repeated_issues: number | null
          overtime_hours: number | null
          created_at: string
          period_type: string
          support_needed: number
          staff_on_duty: number
          absences: number
          late_arrivals: number
          staff_morale: string | null
          has_staff_issues: boolean
        }
        Insert: {
          id?: string
          branch_id: string
          report_id: string
          period_start: string
          period_end: string
          revenue?: number | null
          occupancy_rate?: number | null
          negative_feedback?: number | null
          positive_feedback?: number | null
          unpaid_departures?: number | null
          repeated_issues?: number | null
          overtime_hours?: number | null
          created_at?: string
          period_type?: string
          support_needed?: number
          staff_on_duty?: number
          absences?: number
          late_arrivals?: number
          staff_morale?: string | null
          has_staff_issues?: boolean
        }
        Update: {
          id?: string
          branch_id?: string
          report_id?: string
          period_start?: string
          period_end?: string
          revenue?: number | null
          occupancy_rate?: number | null
          negative_feedback?: number | null
          positive_feedback?: number | null
          unpaid_departures?: number | null
          repeated_issues?: number | null
          overtime_hours?: number | null
          created_at?: string
          period_type?: string
          support_needed?: number
          staff_on_duty?: number
          absences?: number
          late_arrivals?: number
          staff_morale?: string | null
          has_staff_issues?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kpis_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "kpis_report_id_fkey",
            columns: ["report_id"],
            isOneToOne: false,
            referencedRelation: "reports",
            referencedColumns: ["id"],
          }
        ]
      }
      login_otp_challenges: {
        Row: {
          id: string
          user_id: string
          code_hash: string
          expires_at: string
          attempts: number
          max_attempts: number
          consumed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code_hash: string
          expires_at: string
          attempts?: number
          max_attempts?: number
          consumed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code_hash?: string
          expires_at?: string
          attempts?: number
          max_attempts?: number
          consumed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_otp_challenges_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      onboarding_invites: {
        Row: {
          id: string
          token: string
          employee_name: string
          template_id: string
          created_by: string
          status: string
          expires_at: string
          created_at: string
          submitted_at: string | null
          staff_member_id: string | null
        }
        Insert: {
          id?: string
          token: string
          employee_name: string
          template_id: string
          created_by: string
          status?: string
          expires_at: string
          created_at?: string
          submitted_at?: string | null
          staff_member_id?: string | null
        }
        Update: {
          id?: string
          token?: string
          employee_name?: string
          template_id?: string
          created_by?: string
          status?: string
          expires_at?: string
          created_at?: string
          submitted_at?: string | null
          staff_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_invites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      onboarding_submissions: {
        Row: {
          id: string
          invite_id: string
          data: Json
          status: string
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          invite_id: string
          data?: Json
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          invite_id?: string
          data?: Json
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "onboarding_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      onboarding_templates: {
        Row: {
          id: string
          title: string
          fields: Json
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          fields?: Json
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          fields?: Json
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      report_comments: {
        Row: {
          id: string
          report_id: string
          user_id: string
          message: string
          created_at: string | null
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          message: string
          created_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          message?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey",
            columns: ["report_id"],
            isOneToOne: false,
            referencedRelation: "reports",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "report_comments_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      company_form_invites: {
        Row: {
          id: string
          module: string
          token: string
          template_id: string
          subject_name: string
          staff_member_id: string | null
          branch_id: string | null
          created_by: string
          status: string
          expires_at: string
          created_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          module: string
          token: string
          template_id: string
          subject_name: string
          staff_member_id?: string | null
          branch_id?: string | null
          created_by: string
          status?: string
          expires_at: string
          created_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          module?: string
          token?: string
          template_id?: string
          subject_name?: string
          staff_member_id?: string | null
          branch_id?: string | null
          created_by?: string
          status?: string
          expires_at?: string
          created_at?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_form_invites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "company_form_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      company_form_submissions: {
        Row: {
          id: string
          module: string
          template_id: string
          invite_id: string | null
          staff_member_id: string | null
          branch_id: string | null
          submitted_by_user_id: string | null
          shift_date: string | null
          data: Json
          status: string
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          module: string
          template_id: string
          invite_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          submitted_by_user_id?: string | null
          shift_date?: string | null
          data?: Json
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          module?: string
          template_id?: string
          invite_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          submitted_by_user_id?: string | null
          shift_date?: string | null
          data?: Json
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "company_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_form_submissions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "company_form_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_form_submissions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_form_submissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      company_form_templates: {
        Row: {
          id: string
          module: string
          title: string
          fields: Json
          settings: Json
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module: string
          title: string
          fields?: Json
          settings?: Json
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module?: string
          title?: string
          fields?: Json
          settings?: Json
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      export_history: {
        Row: {
          id: string
          user_id: string
          export_type: string
          start_date: string | null
          end_date: string | null
          branches: string | null
          format: string
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          export_type: string
          start_date?: string | null
          end_date?: string | null
          branches?: string | null
          format: string
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          export_type?: string
          start_date?: string | null
          end_date?: string | null
          branches?: string | null
          format?: string
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      export_delivery_schedules: {
        Row: {
          id: string
          user_id: string
          export_type: string
          day_of_week: number
          hour_utc: number
          branch_ids: string[]
          all_branches: boolean
          is_active: boolean
          last_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          export_type: string
          day_of_week?: number
          hour_utc?: number
          branch_ids?: string[]
          all_branches?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          export_type?: string
          day_of_week?: number
          hour_utc?: number
          branch_ids?: string[]
          all_branches?: boolean
          is_active?: boolean
          last_sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_delivery_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      overdue_alert_log: {
        Row: {
          id: string
          report_request_id: string
          sent_at: string
          recipient_role: string
          days_overdue: number
        }
        Insert: {
          id?: string
          report_request_id: string
          sent_at?: string
          recipient_role: string
          days_overdue: number
        }
        Update: {
          id?: string
          report_request_id?: string
          sent_at?: string
          recipient_role?: string
          days_overdue?: number
        }
        Relationships: [
          {
            foreignKeyName: "overdue_alert_log_report_request_id_fkey"
            columns: ["report_request_id"]
            isOneToOne: false
            referencedRelation: "report_requests"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_schedules: {
        Row: {
          id: string
          template_id: string
          branch_ids: string[]
          all_branches: boolean
          day_of_week: number
          period_length_days: number
          due_after_days: number
          is_active: boolean
          created_by: string | null
          created_at: string
          last_run_at: string | null
          next_run_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          branch_ids?: string[]
          all_branches?: boolean
          day_of_week: number
          period_length_days?: number
          due_after_days?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          last_run_at?: string | null
          next_run_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          branch_ids?: string[]
          all_branches?: boolean
          day_of_week?: number
          period_length_days?: number
          due_after_days?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          last_run_at?: string | null
          next_run_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      report_requests: {
        Row: {
          id: string
          branch_id: string
          template_id: string
          title: string
          request_type: string
          period_start: string
          period_end: string
          due_date: string
          status: string
          requested_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          template_id: string
          title: string
          request_type?: string
          period_start: string
          period_end: string
          due_date: string
          status?: string
          requested_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          template_id?: string
          title?: string
          request_type?: string
          period_start?: string
          period_end?: string
          due_date?: string
          status?: string
          requested_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_requests_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "report_requests_template_id_fkey",
            columns: ["template_id"],
            isOneToOne: false,
            referencedRelation: "templates",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "report_requests_requested_by_fkey",
            columns: ["requested_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      reports: {
        Row: {
          id: string
          branch_id: string
          request_id: string
          template_id: string
          data: Json
          status: string
          submitted_at: string | null
          submitted_by: string | null
          period_start: string | null
          period_end: string | null
          type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          request_id: string
          template_id: string
          data: Json
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          period_start?: string | null
          period_end?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          request_id?: string
          template_id?: string
          data?: Json
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          period_start?: string | null
          period_end?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "reports_request_id_fkey",
            columns: ["request_id"],
            isOneToOne: false,
            referencedRelation: "report_requests",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "reports_template_id_fkey",
            columns: ["template_id"],
            isOneToOne: false,
            referencedRelation: "templates",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "reports_submitted_by_fkey",
            columns: ["submitted_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      staff_members: {
        Row: {
          id: string
          full_name: string
          branch_id: string | null
          position: string
          employment_type: string | null
          start_date: string | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          branch_id?: string | null
          position: string
          employment_type?: string | null
          start_date?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          branch_id?: string | null
          position?: string
          employment_type?: string | null
          start_date?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "staff_members_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      staff_documents: {
        Row: {
          id: string
          staff_member_id: string
          label: string
          document_type: string
          expires_at: string | null
          file_path: string | null
          file_name: string | null
          mime_type: string | null
          file_size: number | null
          submission_id: string | null
          last_alert_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_member_id: string
          label: string
          document_type?: string
          expires_at?: string | null
          file_path?: string | null
          file_name?: string | null
          mime_type?: string | null
          file_size?: number | null
          submission_id?: string | null
          last_alert_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_member_id?: string
          label?: string
          document_type?: string
          expires_at?: string | null
          file_path?: string | null
          file_name?: string | null
          mime_type?: string | null
          file_size?: number | null
          submission_id?: string | null
          last_alert_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          }
        ]
      }
      staff_report_entries: {
        Row: {
          id: string
          report_id: string | null
          staff_member_id: string | null
          branch_id: string | null
          week_start: string
          hours_worked: number | null
          overtime_hours: number | null
          absences: number | null
          late_arrivals: number | null
          notes: string | null
          created_at: string | null
          summary: string | null
          created_by: string | null
          period_end: string | null
        }
        Insert: {
          id?: string
          report_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          week_start: string
          hours_worked?: number | null
          overtime_hours?: number | null
          absences?: number | null
          late_arrivals?: number | null
          notes?: string | null
          created_at?: string | null
          summary?: string | null
          created_by?: string | null
          period_end?: string | null
        }
        Update: {
          id?: string
          report_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          week_start?: string
          hours_worked?: number | null
          overtime_hours?: number | null
          absences?: number | null
          late_arrivals?: number | null
          notes?: string | null
          created_at?: string | null
          summary?: string | null
          created_by?: string | null
          period_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_report_entries_report_id_fkey",
            columns: ["report_id"],
            isOneToOne: false,
            referencedRelation: "reports",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "staff_report_entries_staff_member_id_fkey",
            columns: ["staff_member_id"],
            isOneToOne: false,
            referencedRelation: "staff_members",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "staff_report_entries_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "staff_report_entries_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      staff_report_entry_comments: {
        Row: {
          id: string
          staff_report_entry_id: string
          user_id: string
          message: string
          created_at: string | null
        }
        Insert: {
          id?: string
          staff_report_entry_id: string
          user_id: string
          message: string
          created_at?: string | null
        }
        Update: {
          id?: string
          staff_report_entry_id?: string
          user_id?: string
          message?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_report_entry_comments_staff_report_entry_id_fkey",
            columns: ["staff_report_entry_id"],
            isOneToOne: false,
            referencedRelation: "staff_report_entries",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "staff_report_entry_comments_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      templates: {
        Row: {
          id: string
          title: string
          type: string
          fields: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          type?: string
          fields: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: string
          fields?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          staff_report_entry_id: string | null
          staff_member_id: string | null
          branch_id: string | null
          actor_user_id: string | null
          preview: string | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          staff_report_entry_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          actor_user_id?: string | null
          preview?: string | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          staff_report_entry_id?: string | null
          staff_member_id?: string | null
          branch_id?: string | null
          actor_user_id?: string | null
          preview?: string | null
          read_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_notifications_staff_report_entry_id_fkey",
            columns: ["staff_report_entry_id"],
            isOneToOne: false,
            referencedRelation: "staff_report_entries",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_notifications_staff_member_id_fkey",
            columns: ["staff_member_id"],
            isOneToOne: false,
            referencedRelation: "staff_members",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_notifications_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "user_notifications_actor_user_id_fkey",
            columns: ["actor_user_id"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: string
          branch_id: string | null
          full_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role: string
          branch_id?: string | null
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: string
          branch_id?: string | null
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey",
            columns: ["branch_id"],
            isOneToOne: false,
            referencedRelation: "branches",
            referencedColumns: ["id"],
          }
        ]
      }
      workspace_settings: {
        Row: {
          key: string
          value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_updated_by_fkey",
            columns: ["updated_by"],
            isOneToOne: false,
            referencedRelation: "users",
            referencedColumns: ["id"],
          }
        ]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

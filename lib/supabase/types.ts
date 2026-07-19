// Elle yazıldı; gerçek Supabase projesi bağlanınca şu komutla yeniden üretilebilir:
// npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
// Şema kaynağı: supabase/migrations/20260708202344_init_schema.sql
//
// `Relationships: []` her tabloda gerekli — @supabase/postgrest-js'in
// GenericTable kısıtı bu alanı zorunlu tutuyor, yoksa sorgu tipleri `never`'a düşer.

export type SystemRole = "admin" | "member";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "awaiting_approval"
  | "revision"
  | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type RevisionKind = "submitted" | "revision_requested" | "approved";
export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_updated"
  | "task_submitted"
  | "task_approved"
  | "task_revision_requested";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          system_role: SystemRole;
          role_id: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          system_role?: SystemRole;
          role_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          color: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_archived: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_archived?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          assignee_id: string;
          role_id: string | null;
          due_date: string | null;
          start_date: string | null;
          created_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          assignee_id: string;
          role_id?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          created_by: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_role_id_fkey";
            columns: ["role_id"];
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          task_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_revisions: {
        Row: {
          id: string;
          task_id: string;
          author_id: string | null;
          kind: RevisionKind;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id?: string | null;
          kind: RevisionKind;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_revisions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "task_revisions_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_revisions_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_subscriptions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
};

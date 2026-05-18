export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount: number
          checkin_at: string | null
          checkout_at: string | null
          created_at: string
          end_at: string
          hold_expires_at: string | null
          id: string
          lot_device_id: string
          lot_name: string | null
          paid_at: string | null
          plate: string
          slot_index: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          ticket_code: string | null
          updated_at: string
          user_id: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          amount: number
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          end_at: string
          hold_expires_at?: string | null
          id?: string
          lot_device_id: string
          lot_name?: string | null
          paid_at?: string | null
          plate: string
          slot_index?: number | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          ticket_code?: string | null
          updated_at?: string
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          amount?: number
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          end_at?: string
          hold_expires_at?: string | null
          id?: string
          lot_device_id?: string
          lot_name?: string | null
          paid_at?: string | null
          plate?: string
          slot_index?: number | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          ticket_code?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      no_show_events: {
        Row: {
          booking_id: string
          happened_at: string
          id: string
          kind: Database["public"]["Enums"]["no_show_kind"]
          lot_device_id: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          happened_at?: string
          id?: string
          kind: Database["public"]["Enums"]["no_show_kind"]
          lot_device_id?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          happened_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["no_show_kind"]
          lot_device_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      occupancy_snapshots: {
        Row: {
          bucket_ts: string
          id: string
          lot_device_id: string
          lot_name: string | null
          occupancy_rate: number
          occupied: number
          total: number
        }
        Insert: {
          bucket_ts?: string
          id?: string
          lot_device_id: string
          lot_name?: string | null
          occupancy_rate: number
          occupied: number
          total: number
        }
        Update: {
          bucket_ts?: string
          id?: string
          lot_device_id?: string
          lot_name?: string | null
          occupancy_rate?: number
          occupied?: number
          total?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          id: string
          provider: string
          provider_tx_id: string | null
          raw_payload: Json | null
          received_at: string
          sepay_tx_id: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          id?: string
          provider?: string
          provider_tx_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          sepay_tx_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          id?: string
          provider?: string
          provider_tx_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          sepay_tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      slot_holds: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          lot_device_id: string
          slot_index: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          lot_device_id: string
          slot_index: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          lot_device_id?: string
          slot_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_pending_bookings: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_status:
        | "pending"
        | "paid"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
      no_show_kind: "no_pay" | "no_checkin"
      vehicle_type: "car" | "motorbike"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "paid",
        "active",
        "completed",
        "cancelled",
        "expired",
      ],
      no_show_kind: ["no_pay", "no_checkin"],
      vehicle_type: ["car", "motorbike"],
    },
  },
} as const

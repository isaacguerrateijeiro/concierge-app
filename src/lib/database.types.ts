// Tipos generados automáticamente desde el esquema de Supabase.
// NO editar a mano. Regenerar con la CLI de Supabase / MCP cuando cambie el esquema.
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
      categories: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre_i18n: Json
          orden: number
          slug: string
          subtitulo_i18n: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_i18n?: Json
          orden?: number
          slug: string
          subtitulo_i18n?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_i18n?: Json
          orden?: number
          slug?: string
          subtitulo_i18n?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          activo: boolean
          ambito: string
          beneficiario: string
          created_at: string
          id: string
          moneda: string | null
          provider_id: string | null
          service_id: string | null
          tenant_id: string
          tipo_calculo: string
          updated_at: string
          valor: number
        }
        Insert: {
          activo?: boolean
          ambito: string
          beneficiario: string
          created_at?: string
          id?: string
          moneda?: string | null
          provider_id?: string | null
          service_id?: string | null
          tenant_id: string
          tipo_calculo: string
          updated_at?: string
          valor: number
        }
        Update: {
          activo?: boolean
          ambito?: string
          beneficiario?: string
          created_at?: string
          id?: string
          moneda?: string | null
          provider_id?: string | null
          service_id?: string | null
          tenant_id?: string
          tipo_calculo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          tenant_id: string
          tipo_i18n: Json
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          tenant_id: string
          tipo_i18n?: Json
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          tenant_id?: string
          tipo_i18n?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_commissions: {
        Row: {
          beneficiario: string
          created_at: string
          id: string
          importe: number
          order_item_id: string
          tipo_calculo: string | null
          valor: number | null
        }
        Insert: {
          beneficiario: string
          created_at?: string
          id?: string
          importe: number
          order_item_id: string
          tipo_calculo?: string | null
          valor?: number | null
        }
        Update: {
          beneficiario?: string
          created_at?: string
          id?: string
          importe?: number
          order_item_id?: string
          tipo_calculo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_commissions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          importe: number
          order_id: string
          precio_unitario: number
          service_id: string | null
          service_slug: string
          titulo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          importe: number
          order_id: string
          precio_unitario: number
          service_id?: string | null
          service_slug: string
          titulo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          importe?: number
          order_id?: string
          precio_unitario?: number
          service_id?: string | null
          service_slug?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          estado: string
          id: string
          idioma: string | null
          importe_total: number
          location_id: string | null
          moneda: string
          paid_at: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          idioma?: string | null
          importe_total: number
          location_id?: string | null
          moneda?: string
          paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          idioma?: string | null
          importe_total?: number
          location_id?: string | null
          moneda?: string
          paid_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          activo: boolean
          color_marca: string | null
          created_at: string
          id: string
          logo: string | null
          nombre: string
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          color_marca?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          nombre: string
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          color_marca?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          nombre?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          activo: boolean
          category_id: string
          created_at: string
          icono: string | null
          id: string
          moneda: string
          orden: number
          precio_desde: number | null
          provider_id: string
          slug: string
          subtitulo_i18n: Json
          tenant_id: string
          tipo_pago: string
          titulo_i18n: Json
          updated_at: string
          url_redireccion: string | null
        }
        Insert: {
          activo?: boolean
          category_id: string
          created_at?: string
          icono?: string | null
          id?: string
          moneda?: string
          orden?: number
          precio_desde?: number | null
          provider_id: string
          slug: string
          subtitulo_i18n?: Json
          tenant_id: string
          tipo_pago: string
          titulo_i18n?: Json
          updated_at?: string
          url_redireccion?: string | null
        }
        Update: {
          activo?: boolean
          category_id?: string
          created_at?: string
          icono?: string | null
          id?: string
          moneda?: string
          orden?: number
          precio_desde?: number | null
          provider_id?: string
          slug?: string
          subtitulo_i18n?: Json
          tenant_id?: string
          tipo_pago?: string
          titulo_i18n?: Json
          updated_at?: string
          url_redireccion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activo: boolean
          branding: Json
          created_at: string
          id: string
          locale_default: string
          locales: string[]
          nombre: string
          slug: string
          ui_textos: Json
          updated_at: string
        }
        Insert: {
          activo?: boolean
          branding?: Json
          created_at?: string
          id?: string
          locale_default?: string
          locales?: string[]
          nombre: string
          slug: string
          ui_textos?: Json
          updated_at?: string
        }
        Update: {
          activo?: boolean
          branding?: Json
          created_at?: string
          id?: string
          locale_default?: string
          locales?: string[]
          nombre?: string
          slug?: string
          ui_textos?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_catalog: { Args: { p_tenant_slug: string }; Returns: Json }
      get_order_status: { Args: { p_session_id: string }; Returns: Json }
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
    Enums: {},
  },
} as const

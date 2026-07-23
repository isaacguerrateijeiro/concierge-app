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
      campaigns: {
        Row: {
          asunto: string | null
          audiencia: number
          canal: string
          created_at: string
          created_by: string | null
          enviada_at: string | null
          enviados: number
          estado: string
          fallidos: number
          id: string
          mensaje: string
          nombre: string
          segmento: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asunto?: string | null
          audiencia?: number
          canal: string
          created_at?: string
          created_by?: string | null
          enviada_at?: string | null
          enviados?: number
          estado?: string
          fallidos?: number
          id?: string
          mensaje: string
          nombre: string
          segmento?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          asunto?: string | null
          audiencia?: number
          canal?: string
          created_at?: string
          created_by?: string | null
          enviada_at?: string | null
          enviados?: number
          estado?: string
          fallidos?: number
          id?: string
          mensaje?: string
          nombre?: string
          segmento?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      import_runs: {
        Row: {
          actualizados: number
          creados: number
          created_at: string
          detalle: Json
          detectados: number
          errores: number
          estado: string
          fuente_url: string | null
          id: string
          provider_id: string
          tenant_id: string
        }
        Insert: {
          actualizados?: number
          creados?: number
          created_at?: string
          detalle?: Json
          detectados?: number
          errores?: number
          estado?: string
          fuente_url?: string | null
          id?: string
          provider_id: string
          tenant_id: string
        }
        Update: {
          actualizados?: number
          creados?: number
          created_at?: string
          detalle?: Json
          detectados?: number
          errores?: number
          estado?: string
          fuente_url?: string | null
          id?: string
          provider_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_events: {
        Row: {
          created_at: string
          id: number
          payload: Json
          session_id: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: number
          payload?: Json
          session_id: string
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json
          session_id?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kiosk_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_sessions: {
        Row: {
          converted: boolean
          id: string
          last_seen_at: string
          locale: string | null
          location_id: string | null
          order_id: string | null
          reached_cart: boolean
          reached_checkout: boolean
          started_at: string
          tenant_id: string
        }
        Insert: {
          converted?: boolean
          id: string
          last_seen_at?: string
          locale?: string | null
          location_id?: string | null
          order_id?: string | null
          reached_cart?: boolean
          reached_checkout?: boolean
          started_at?: string
          tenant_id: string
        }
        Update: {
          converted?: boolean
          id?: string
          last_seen_at?: string
          locale?: string | null
          location_id?: string | null
          order_id?: string | null
          reached_cart?: boolean
          reached_checkout?: boolean
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_sessions_tenant_id_fkey"
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
      memberships: {
        Row: {
          created_at: string
          id: string
          rol: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rol: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rol?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bookings: {
        Row: {
          adaptador: string | null
          created_at: string
          error: string | null
          estado: string
          id: string
          order_id: string
          provider_id: string
          referencia_externa: string | null
          updated_at: string
        }
        Insert: {
          adaptador?: string | null
          created_at?: string
          error?: string | null
          estado?: string
          id?: string
          order_id: string
          provider_id: string
          referencia_externa?: string | null
          updated_at?: string
        }
        Update: {
          adaptador?: string | null
          created_at?: string
          error?: string | null
          estado?: string
          id?: string
          order_id?: string
          provider_id?: string
          referencia_externa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
      order_deliveries: {
        Row: {
          canal: string
          created_at: string
          destino: string | null
          error: string | null
          estado: string
          id: string
          order_id: string
          proveedor_msg_id: string | null
          updated_at: string
        }
        Insert: {
          canal: string
          created_at?: string
          destino?: string | null
          error?: string | null
          estado?: string
          id?: string
          order_id: string
          proveedor_msg_id?: string | null
          updated_at?: string
        }
        Update: {
          canal?: string
          created_at?: string
          destino?: string | null
          error?: string | null
          estado?: string
          id?: string
          order_id?: string
          proveedor_msg_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_invoices: {
        Row: {
          anio: number
          base_imponible: number
          created_at: string
          cuota_iva: number
          desglose_iva: Json
          emisor: Json
          fecha: string
          id: string
          moneda: string
          numero: number
          order_id: string
          provider_id: string
          serie: string
          total: number
        }
        Insert: {
          anio: number
          base_imponible: number
          created_at?: string
          cuota_iva: number
          desglose_iva?: Json
          emisor: Json
          fecha?: string
          id?: string
          moneda?: string
          numero: number
          order_id: string
          provider_id: string
          serie: string
          total: number
        }
        Update: {
          anio?: number
          base_imponible?: number
          created_at?: string
          cuota_iva?: number
          desglose_iva?: Json
          emisor?: Json
          fecha?: string
          id?: string
          moneda?: string
          numero?: number
          order_id?: string
          provider_id?: string
          serie?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cantidad: number
          created_at: string
          fecha_servicio: string | null
          id: string
          importe: number
          iva_tipo: number
          order_id: string
          precio_unitario: number
          service_id: string | null
          service_slug: string
          titulo: string
          variant_label: string | null
          variant_tipo: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          fecha_servicio?: string | null
          id?: string
          importe: number
          iva_tipo?: number
          order_id: string
          precio_unitario: number
          service_id?: string | null
          service_slug: string
          titulo: string
          variant_label?: string | null
          variant_tipo?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          fecha_servicio?: string | null
          id?: string
          importe?: number
          iva_tipo?: number
          order_id?: string
          precio_unitario?: number
          service_id?: string | null
          service_slug?: string
          titulo?: string
          variant_label?: string | null
          variant_tipo?: string | null
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
      order_transfers: {
        Row: {
          created_at: string
          error: string | null
          estado: string
          id: string
          importe: number
          moneda: string
          order_id: string
          provider_id: string
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          estado?: string
          id?: string
          importe: number
          moneda?: string
          order_id: string
          provider_id: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          estado?: string
          id?: string
          importe?: number
          moneda?: string
          order_id?: string
          provider_id?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_transfers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_vouchers: {
        Row: {
          codigo: string
          created_at: string
          estado: string
          id: string
          order_id: string
          order_item_id: string
          provider_id: string | null
          redeemed_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          estado?: string
          id?: string
          order_id: string
          order_item_id: string
          provider_id?: string | null
          redeemed_at?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          estado?: string
          id?: string
          order_id?: string
          order_item_id?: string
          provider_id?: string | null
          redeemed_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_vouchers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_vouchers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_vouchers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
          recibo_token: string | null
          referencia: string | null
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
          recibo_token?: string | null
          referencia?: string | null
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
          recibo_token?: string | null
          referencia?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_platform_admin: boolean
          nombre: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_platform_admin?: boolean
          nombre?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_platform_admin?: boolean
          nombre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_invoice_counters: {
        Row: {
          anio: number
          provider_id: string
          serie: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          anio: number
          provider_id: string
          serie: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          anio?: number
          provider_id?: string
          serie?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_invoice_counters_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          activo: boolean
          color_marca: string | null
          created_at: string
          fiscal_config: Json
          fuente_config: Json
          fuente_url: string | null
          id: string
          integracion_config: Json
          logo: string | null
          nombre: string
          slug: string
          stripe_account_id: string | null
          stripe_onboarding_estado: string | null
          stripe_payouts_activos: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          color_marca?: string | null
          created_at?: string
          fiscal_config?: Json
          fuente_config?: Json
          fuente_url?: string | null
          id?: string
          integracion_config?: Json
          logo?: string | null
          nombre: string
          slug: string
          stripe_account_id?: string | null
          stripe_onboarding_estado?: string | null
          stripe_payouts_activos?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          color_marca?: string | null
          created_at?: string
          fiscal_config?: Json
          fuente_config?: Json
          fuente_url?: string | null
          id?: string
          integracion_config?: Json
          logo?: string | null
          nombre?: string
          slug?: string
          stripe_account_id?: string | null
          stripe_onboarding_estado?: string | null
          stripe_payouts_activos?: boolean
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
      service_availability: {
        Row: {
          activo: boolean
          capacidad: number
          created_at: string
          fecha: string
          id: string
          reservados: number
          service_id: string
        }
        Insert: {
          activo?: boolean
          capacidad?: number
          created_at?: string
          fecha: string
          id?: string
          reservados?: number
          service_id: string
        }
        Update: {
          activo?: boolean
          capacidad?: number
          created_at?: string
          fecha?: string
          id?: string
          reservados?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_price_tiers: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          label_i18n: Json
          orden: number
          precio: number
          service_id: string
          tipo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          label_i18n?: Json
          orden?: number
          precio: number
          service_id: string
          tipo: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          label_i18n?: Json
          orden?: number
          precio?: number
          service_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_price_tiers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          activo: boolean
          capacidad_diaria: number | null
          category_id: string
          created_at: string
          descripcion_i18n: Json
          duracion_i18n: Json
          estado: string
          fuente_ref: string | null
          icono: string | null
          id: string
          imagen_url: string | null
          iva_tipo: number | null
          moneda: string
          orden: number
          parent_id: string | null
          precio_desde: number | null
          provider_id: string
          punto_encuentro_i18n: Json
          instrucciones_i18n: Json
          importado_at: string | null
          slug: string
          subtitulo_i18n: Json
          tenant_id: string
          tipo_nodo: string
          tipo_pago: string | null
          titulo_i18n: Json
          updated_at: string
          url_redireccion: string | null
        }
        Insert: {
          activo?: boolean
          capacidad_diaria?: number | null
          category_id: string
          created_at?: string
          descripcion_i18n?: Json
          duracion_i18n?: Json
          estado?: string
          fuente_ref?: string | null
          icono?: string | null
          importado_at?: string | null
          id?: string
          imagen_url?: string | null
          iva_tipo?: number | null
          moneda?: string
          orden?: number
          parent_id?: string | null
          precio_desde?: number | null
          provider_id: string
          punto_encuentro_i18n?: Json
          instrucciones_i18n?: Json
          slug: string
          subtitulo_i18n?: Json
          tenant_id: string
          tipo_nodo?: string
          tipo_pago?: string | null
          titulo_i18n?: Json
          updated_at?: string
          url_redireccion?: string | null
        }
        Update: {
          activo?: boolean
          capacidad_diaria?: number | null
          category_id?: string
          created_at?: string
          descripcion_i18n?: Json
          duracion_i18n?: Json
          estado?: string
          fuente_ref?: string | null
          icono?: string | null
          id?: string
          imagen_url?: string | null
          importado_at?: string | null
          iva_tipo?: number | null
          moneda?: string
          orden?: number
          parent_id?: string | null
          precio_desde?: number | null
          provider_id?: string
          punto_encuentro_i18n?: Json
          instrucciones_i18n?: Json
          slug?: string
          subtitulo_i18n?: Json
          tenant_id?: string
          tipo_nodo?: string
          tipo_pago?: string | null
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
            foreignKeyName: "services_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "services"
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
          entrega_config: Json
          id: string
          legal_config: Json
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
          entrega_config?: Json
          id?: string
          legal_config?: Json
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
          entrega_config?: Json
          id?: string
          legal_config?: Json
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
      app_can_access_tenant: { Args: { p_tenant: string }; Returns: boolean }
      app_has_tenant_role: {
        Args: { p_roles: string[]; p_tenant: string }
        Returns: boolean
      }
      app_is_platform_admin: { Args: never; Returns: boolean }
      get_catalog: { Args: { p_tenant_slug: string }; Returns: Json }
      get_disponibilidad: {
        Args: { p_desde: string; p_hasta: string; p_service_slug: string }
        Returns: Json
      }
      get_order_status: { Args: { p_session_id: string }; Returns: Json }
      get_recibo: { Args: { p_token: string }; Returns: Json }
      panel_cliente_detalle: {
        Args: { p_cliente_id: string; p_tenant: string }
        Returns: Json
      }
      panel_clientes: {
        Args: { p_desde: string; p_hasta: string; p_tenant: string }
        Returns: Json
      }
      panel_funnel: {
        Args: { p_desde: string; p_hasta: string; p_tenant: string }
        Returns: Json
      }
      panel_metrics: {
        Args: { p_desde: string; p_hasta: string; p_tenant: string }
        Returns: Json
      }
      panel_top_servicios: {
        Args: {
          p_desde: string
          p_hasta: string
          p_limite?: number
          p_tenant: string
        }
        Returns: Json
      }
      panel_ventas: {
        Args: { p_desde: string; p_hasta: string; p_tenant: string }
        Returns: Json
      }
      reservar_stock: {
        Args: { p_cantidad: number; p_fecha: string; p_service_id: string }
        Returns: boolean
      }
      siguiente_numero_factura: {
        Args: { p_anio: number; p_provider_id: string; p_serie: string }
        Returns: number
      }
      track_kiosk_event: {
        Args: {
          p_locale?: string
          p_location_id?: string
          p_payload?: Json
          p_session: string
          p_tenant_slug: string
          p_tipo: string
        }
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

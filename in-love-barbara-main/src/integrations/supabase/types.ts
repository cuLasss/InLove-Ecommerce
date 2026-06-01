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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      birthday_messages: {
        Row: {
          client_id: string
          client_name: string
          client_whatsapp: string
          created_at: string | null
          id: string
          message: string
          message_type: string
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          client_whatsapp: string
          created_at?: string | null
          id?: string
          message: string
          message_type?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          client_whatsapp?: string
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "birthday_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist: {
        Row: {
          blocked_at: string
          blocked_until: string | null
          client_id: string
          client_name: string
          client_type: Database["public"]["Enums"]["client_type_enum"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reason: string
          updated_at: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_until?: string | null
          client_id: string
          client_name: string
          client_type: Database["public"]["Enums"]["client_type_enum"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reason: string
          updated_at?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_until?: string | null
          client_id?: string
          client_name?: string
          client_type?: Database["public"]["Enums"]["client_type_enum"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          birth_date: string | null
          birthday: string | null
          city: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          state: string | null
          types: string[] | null
          updated_at: string | null
          whatsapp: string | null
          zip: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          birthday?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          state?: string | null
          types?: string[] | null
          updated_at?: string | null
          whatsapp?: string | null
          zip?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          birthday?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          state?: string | null
          types?: string[] | null
          updated_at?: string | null
          whatsapp?: string | null
          zip?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          role: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          role?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      consignacao_history: {
        Row: {
          consignacao_id: string
          consignacao_item_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          operation_description: string | null
          product_id: string
          qty_devolvida: number
          qty_total_devolvida: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          consignacao_id: string
          consignacao_item_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          operation_description?: string | null
          product_id: string
          qty_devolvida?: number
          qty_total_devolvida?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          consignacao_id?: string
          consignacao_item_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          operation_description?: string | null
          product_id?: string
          qty_devolvida?: number
          qty_total_devolvida?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignacao_history_consignacao_id_fkey"
            columns: ["consignacao_id"]
            isOneToOne: false
            referencedRelation: "consignacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_history_consignacao_item_id_fkey"
            columns: ["consignacao_item_id"]
            isOneToOne: false
            referencedRelation: "consignacao_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
        ]
      }
      consignacao_items: {
        Row: {
          commission_percent: number
          consignacao_id: string
          created_at: string
          desconto_percentual: number
          id: string
          preco_base_cents: number
          product_id: string
          qtd_devolvida: number
          qtd_enviada: number
          qtd_perda: number
          qtd_vendida: number
          qty: number
          status: string
          unit_price_cents: number
          updated_at: string | null
        }
        Insert: {
          commission_percent?: number
          consignacao_id: string
          created_at?: string
          desconto_percentual?: number
          id?: string
          preco_base_cents?: number
          product_id: string
          qtd_devolvida?: number
          qtd_enviada?: number
          qtd_perda?: number
          qtd_vendida?: number
          qty: number
          status?: string
          unit_price_cents?: number
          updated_at?: string | null
        }
        Update: {
          commission_percent?: number
          consignacao_id?: string
          created_at?: string
          desconto_percentual?: number
          id?: string
          preco_base_cents?: number
          product_id?: string
          qtd_devolvida?: number
          qtd_enviada?: number
          qtd_perda?: number
          qtd_vendida?: number
          qty?: number
          status?: string
          unit_price_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignacao_items_consignacao_id_fkey"
            columns: ["consignacao_id"]
            isOneToOne: false
            referencedRelation: "consignacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
        ]
      }
      consignacoes: {
        Row: {
          city: string | null
          client_id: string
          codigo: string | null
          commission_default_percent: number
          consultora_id: string | null
          created_at: string
          data_prevista: string | null
          id: string
          observacao: string | null
          prazo_previsto: number | null
          representative_name: string | null
          status: Database["public"]["Enums"]["consign_status"]
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          codigo?: string | null
          commission_default_percent?: number
          consultora_id?: string | null
          created_at?: string
          data_prevista?: string | null
          id?: string
          observacao?: string | null
          prazo_previsto?: number | null
          representative_name?: string | null
          status?: Database["public"]["Enums"]["consign_status"]
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          codigo?: string | null
          commission_default_percent?: number
          consultora_id?: string | null
          created_at?: string
          data_prevista?: string | null
          id?: string
          observacao?: string | null
          prazo_previsto?: number | null
          representative_name?: string | null
          status?: Database["public"]["Enums"]["consign_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignacoes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacoes_consultora_id_fkey"
            columns: ["consultora_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          motivo: string | null
          product_id: string
          qty: number
          sale_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          motivo?: string | null
          product_id: string
          qty: number
          sale_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          motivo?: string | null
          product_id?: string
          qty?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "devolucoes_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      invalid_nfe_imports: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          destinatario_cnpj: string | null
          destinatario_nome: string | null
          emitente_cnpj: string | null
          error_details: Json | null
          error_message: string
          error_type: string
          file_name: string | null
          id: string
          numero: string | null
          original_nfe_id: string | null
          provider: string | null
          raw_xml: string | null
          serie: string | null
          status_nfe: string | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          error_details?: Json | null
          error_message: string
          error_type: string
          file_name?: string | null
          id?: string
          numero?: string | null
          original_nfe_id?: string | null
          provider?: string | null
          raw_xml?: string | null
          serie?: string | null
          status_nfe?: string | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          error_details?: Json | null
          error_message?: string
          error_type?: string
          file_name?: string | null
          id?: string
          numero?: string | null
          original_nfe_id?: string | null
          provider?: string | null
          raw_xml?: string | null
          serie?: string | null
          status_nfe?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invalid_nfe_imports_original_nfe_id_fkey"
            columns: ["original_nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_imports: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          destinatario_cnpj: string | null
          destinatario_nome: string | null
          emitente_cnpj: string | null
          file_name: string | null
          hash: string | null
          id: string
          numero: string | null
          provider: string | null
          raw_xml: string | null
          serie: string | null
          status: string | null
          status_nfe: string | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          file_name?: string | null
          hash?: string | null
          id?: string
          numero?: string | null
          provider?: string | null
          raw_xml?: string | null
          serie?: string | null
          status?: string | null
          status_nfe?: string | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          emitente_cnpj?: string | null
          file_name?: string | null
          hash?: string | null
          id?: string
          numero?: string | null
          provider?: string | null
          raw_xml?: string | null
          serie?: string | null
          status?: string | null
          status_nfe?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      nfe_items: {
        Row: {
          cfop: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          ncm: string | null
          nfe_import_id: string
          product_id: string | null
          qty: number | null
          total_value_cents: number | null
          unidade: string | null
          unit_value_cents: number | null
        }
        Insert: {
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ncm?: string | null
          nfe_import_id: string
          product_id?: string | null
          qty?: number | null
          total_value_cents?: number | null
          unidade?: string | null
          unit_value_cents?: number | null
        }
        Update: {
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ncm?: string | null
          nfe_import_id?: string
          product_id?: string | null
          qty?: number | null
          total_value_cents?: number | null
          unidade?: string | null
          unit_value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_items_nfe_import_id_fkey"
            columns: ["nfe_import_id"]
            isOneToOne: false
            referencedRelation: "nfe_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          collaborator_id: string | null
          consignacao_id: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          received_by: string | null
          sale_id: string | null
        }
        Insert: {
          amount_cents: number
          collaborator_id?: string | null
          consignacao_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          sale_id?: string | null
        }
        Update: {
          amount_cents?: number
          collaborator_id?: string | null
          consignacao_id?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_consignacao_id_fkey"
            columns: ["consignacao_id"]
            isOneToOne: false
            referencedRelation: "consignacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand_id: string | null
          category_id: string | null
          color: string | null
          cost_cents: number | null
          cost_price_cents: number
          created_at: string
          description: string | null
          id: string
          min_stock: number | null
          name: string
          photo_url: string | null
          price_cents: number
          qr_code: string | null
          short_code: string | null
          size: string | null
          stock: number
          stock_consigned: number
          stock_min: number
          stock_quantity: number | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_cents?: number | null
          cost_price_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number | null
          name: string
          photo_url?: string | null
          price_cents?: number
          qr_code?: string | null
          short_code?: string | null
          size?: string | null
          stock?: number
          stock_consigned?: number
          stock_min?: number
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_cents?: number | null
          cost_price_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          photo_url?: string | null
          price_cents?: number
          qr_code?: string | null
          short_code?: string | null
          size?: string | null
          stock?: number
          stock_consigned?: number
          stock_min?: number
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          product_id: string
          qty: number
          sale_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          product_id: string
          qty: number
          sale_id: string
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          product_id?: string
          qty?: number
          sale_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: Database["public"]["Enums"]["sale_channel"]
          client_id: string | null
          closed_at: string | null
          created_at: string
          discount_total_cents: number
          id: string
          payment_summary: Json | null
          status: Database["public"]["Enums"]["sale_status"]
          total_cents: number
          user_id: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount_total_cents?: number
          id?: string
          payment_summary?: Json | null
          status?: Database["public"]["Enums"]["sale_status"]
          total_cents?: number
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount_total_cents?: number
          id?: string
          payment_summary?: Json | null
          status?: Database["public"]["Enums"]["sale_status"]
          total_cents?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_nonces: {
        Row: {
          created_at: string
          id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          value?: string
        }
        Relationships: []
      }
      seq_consignado: {
        Row: {
          id: boolean
          last_number: number
          year: number
        }
        Insert: {
          id?: boolean
          last_number?: number
          year?: number
        }
        Update: {
          id?: boolean
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_consignado_por_produto: {
        Row: {
          product_id: string | null
          qty_devolvida: number | null
          qty_enviada: number | null
          qty_perda: number | null
          qty_reservada: number | null
          qty_vendida: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consignacao_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignacao_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_consolidado"
            referencedColumns: ["product_id"]
          },
        ]
      }
      vw_estoque_consolidado: {
        Row: {
          estoque_consignado_coluna: number | null
          estoque_consignado_view: number | null
          estoque_normal: number | null
          estoque_total_aparente: number | null
          name: string | null
          product_id: string | null
          short_code: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_check_client_blacklist: {
        Args: { client_uuid: string }
        Returns: {
          blocked_at: string
          blocked_until: string
          days_remaining: number
          is_blocked: boolean
          reason: string
        }[]
      }
      fn_check_client_blacklist_by_type: {
        Args: {
          client_type_param: Database["public"]["Enums"]["client_type_enum"]
          client_uuid: string
        }
        Returns: {
          blocked_at: string
          blocked_until: string
          days_remaining: number
          is_blocked: boolean
          reason: string
        }[]
      }
      fn_get_atacado_clients_for_blacklist: {
        Args: never
        Returns: {
          blocked_reason: string
          blocked_until: string
          city: string
          id: string
          is_blocked: boolean
          name: string
          state: string
          whatsapp: string
        }[]
      }
      fn_get_blacklist_stats: {
        Args: never
        Returns: {
          active_blocked: number
          atacado_clients_count: number
          blocked_atacado_count: number
          expired_blocked: number
          total_blocked: number
        }[]
      }
      fn_processar_devolucao: {
        Args: {
          p_motivo?: string
          p_product_id: string
          p_qty: number
          p_sale_id: string
        }
        Returns: Json
      }
      fn_processar_devolucao_completa: {
        Args: { p_motivo?: string; p_sale_id: string }
        Returns: Json
      }
      fn_proximo_codigo_consignado: { Args: never; Returns: string }
      fn_unblock_client: { Args: { client_uuid: string }; Returns: boolean }
      fn_unblock_client_simple: {
        Args: { client_uuid: string }
        Returns: boolean
      }
      fn_validate_atacado_client: {
        Args: { client_uuid: string }
        Returns: boolean
      }
      increment_product_stock: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
    }
    Enums: {
      client_type_enum: "CONSIGNADO" | "ATACADO" | "VAREJO"
      consign_status:
        | "RASCUNHO"
        | "ENTREGUE"
        | "EM_CONFERENCIA"
        | "FINALIZADO"
        | "CANCELADA"
      payment_method:
        | "DINHEIRO"
        | "PIX"
        | "DEBITO"
        | "CREDITO"
        | "OUTRO"
        | "TRANSFERENCIA_BANCARIA"
        | "CHEQUE"
      sale_channel: "VAREJO" | "ATACADO"
      sale_status: "RASCUNHO" | "FECHADA" | "CANCELADA"
      user_role: "ADMIN" | "COLAB"
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
      client_type_enum: ["CONSIGNADO", "ATACADO", "VAREJO"],
      consign_status: [
        "RASCUNHO",
        "ENTREGUE",
        "EM_CONFERENCIA",
        "FINALIZADO",
        "CANCELADA",
      ],
      payment_method: [
        "DINHEIRO",
        "PIX",
        "DEBITO",
        "CREDITO",
        "OUTRO",
        "TRANSFERENCIA_BANCARIA",
        "CHEQUE",
      ],
      sale_channel: ["VAREJO", "ATACADO"],
      sale_status: ["RASCUNHO", "FECHADA", "CANCELADA"],
      user_role: ["ADMIN", "COLAB"],
    },
  },
} as const

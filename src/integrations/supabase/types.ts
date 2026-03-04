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
      auri_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auri_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "auri_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "auri_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_cpfs: {
        Row: {
          blocked_at: string
          cpf: string
          id: string
          notes: string | null
          original_user_id: string | null
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          cpf: string
          id?: string
          notes?: string | null
          original_user_id?: string | null
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          cpf?: string
          id?: string
          notes?: string | null
          original_user_id?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          birth_date: string | null
          cpf: string
          created_at: string
          current_balance: number
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          birth_date?: string | null
          cpf: string
          created_at?: string
          current_balance?: number
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          birth_date?: string | null
          cpf?: string
          created_at?: string
          current_balance?: number
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          customer_email: string
          document_type: string
          error_message: string | null
          id: string
          pdf_url: string | null
          sale_id: string | null
          sender_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          document_type?: string
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          sale_id?: string | null
          sender_email: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          document_type?: string
          error_message?: string | null
          id?: string
          pdf_url?: string | null
          sale_id?: string | null
          sender_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          can_access_customers: boolean
          can_access_dashboard: boolean
          can_access_history: boolean
          can_access_mailbox: boolean
          can_access_pos: boolean
          can_access_products: boolean
          can_access_reports: boolean
          can_access_settings: boolean
          can_access_suppliers: boolean
          can_edit_own_profile: boolean
          can_view_subscription: boolean
          created_at: string
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          can_access_customers?: boolean
          can_access_dashboard?: boolean
          can_access_history?: boolean
          can_access_mailbox?: boolean
          can_access_pos?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_settings?: boolean
          can_access_suppliers?: boolean
          can_edit_own_profile?: boolean
          can_view_subscription?: boolean
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          can_access_customers?: boolean
          can_access_dashboard?: boolean
          can_access_history?: boolean
          can_access_mailbox?: boolean
          can_access_pos?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_settings?: boolean
          can_access_suppliers?: boolean
          can_edit_own_profile?: boolean
          can_view_subscription?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admin_id: string
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_code_usage: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          ip_address: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          ip_address: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          ip_address?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          available_colors: string[] | null
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          internal_code: string | null
          is_active: boolean
          min_stock_quantity: number | null
          name: string
          photos: string[] | null
          price: number
          promotional_price: number | null
          stock_quantity: number
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_colors?: string[] | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean
          min_stock_quantity?: number | null
          name: string
          photos?: string[] | null
          price: number
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_colors?: string[] | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_code?: string | null
          is_active?: boolean
          min_stock_quantity?: number | null
          name?: string
          photos?: string[] | null
          price?: number
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      profiles: {
        Row: {
          cep: string | null
          city: string | null
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          invite_code: string | null
          invite_code_used: boolean | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          referred_by: string | null
          state: string | null
          street: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id: string
          invite_code?: string | null
          invite_code_used?: boolean | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          referred_by?: string | null
          state?: string | null
          street?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invite_code?: string | null
          invite_code_used?: boolean | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          referred_by?: string | null
          state?: string | null
          street?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string | null
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          purchase_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          supplier_id: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          supplier_id?: string | null
          total_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          supplier_id?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
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
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity: number
          sale_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sale_id?: string
          unit_price?: number
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
          created_at: string
          customer_id: string | null
          discount: number | null
          id: string
          payment_method: string
          payment_status: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number | null
          id?: string
          payment_method: string
          payment_status?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number | null
          id?: string
          payment_method?: string
          payment_status?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_integrations: {
        Row: {
          created_at: string
          encrypted_token: string | null
          id: string
          integration_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_token?: string | null
          id?: string
          integration_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_token?: string | null
          id?: string
          integration_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          category: string | null
          commercial_phone: string | null
          created_at: string
          has_employees: boolean | null
          hide_trial_message: boolean | null
          id: string
          logo_url: string | null
          mercado_pago_cpf: string | null
          mercado_pago_name: string | null
          operation_type: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_mode: string | null
          pix_receiver_name: string | null
          primary_color: string | null
          quick_actions_enabled: boolean | null
          store_address: string | null
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string
          has_employees?: boolean | null
          hide_trial_message?: boolean | null
          id?: string
          logo_url?: string | null
          mercado_pago_cpf?: string | null
          mercado_pago_name?: string | null
          operation_type?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_mode?: string | null
          pix_receiver_name?: string | null
          primary_color?: string | null
          quick_actions_enabled?: boolean | null
          store_address?: string | null
          store_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string
          has_employees?: boolean | null
          hide_trial_message?: boolean | null
          id?: string
          logo_url?: string | null
          mercado_pago_cpf?: string | null
          mercado_pago_name?: string | null
          operation_type?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_mode?: string | null
          pix_receiver_name?: string | null
          primary_color?: string | null
          quick_actions_enabled?: boolean | null
          store_address?: string | null
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          plan_type: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          plan_type: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          plan_type?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          days_to_add: number
          id: string
          mercado_pago_payment_id: string | null
          mercado_pago_pix_copy_paste: string | null
          mercado_pago_qr_code: string | null
          mercado_pago_qr_code_base64: string | null
          paid_at: string | null
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          days_to_add: number
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_pix_copy_paste?: string | null
          mercado_pago_qr_code?: string | null
          mercado_pago_qr_code_base64?: string | null
          paid_at?: string | null
          plan_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          days_to_add?: number
          id?: string
          mercado_pago_payment_id?: string | null
          mercado_pago_pix_copy_paste?: string | null
          mercado_pago_qr_code?: string | null
          mercado_pago_qr_code_base64?: string | null
          paid_at?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_redemption_codes: {
        Row: {
          benefit_type: string | null
          code: string
          created_at: string
          days_added: number | null
          id: string
          is_used: boolean
          used_at: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          benefit_type?: string | null
          code: string
          created_at?: string
          days_added?: number | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          benefit_type?: string | null
          code?: string
          created_at?: string
          days_added?: number | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_weekly_code_for_user: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_weekly_redemption_code: { Args: never; Returns: string }
      get_admin_store_settings: {
        Args: { admin_user_id: string }
        Returns: {
          hide_trial_message: boolean
          quick_actions_enabled: boolean
        }[]
      }
      get_admin_subscription: {
        Args: { admin_user_id: string }
        Returns: {
          subscription_ends_at: string
          subscription_plan: string
          trial_ends_at: string
        }[]
      }
      get_profile_created_at_by_email: {
        Args: { p_email: string }
        Returns: {
          created_at: string
        }[]
      }
      get_user_email_by_cpf: {
        Args: { search_cpf: string }
        Returns: {
          email: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cpf_blocked: { Args: { check_cpf: string }; Returns: boolean }
      redeem_weekly_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      validate_invite_code: {
        Args: { code: string }
        Returns: {
          is_already_used: boolean
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "caixa"
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
      app_role: ["admin", "gerente", "caixa"],
    },
  },
} as const

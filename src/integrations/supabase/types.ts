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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
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
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      employee_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          employee_id: string
          id: string
          permission_key: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          employee_id: string
          id?: string
          permission_key: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          admin_id: string
          cargo: string
          cpf: string
          created_at: string
          description: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          admin_id: string
          cargo?: string
          cpf: string
          created_at?: string
          description?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          cargo?: string
          cpf?: string
          created_at?: string
          description?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          min_stock_quantity: number | null
          name: string
          photos: string[] | null
          price: number
          product_type: string
          promotional_price: number | null
          stock_quantity: number
          supplier_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_quantity?: number | null
          name: string
          photos?: string[] | null
          price?: number
          product_type?: string
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_quantity?: number | null
          name?: string
          photos?: string[] | null
          price?: number
          product_type?: string
          promotional_price?: number | null
          stock_quantity?: number
          supplier_id?: string | null
          updated_at?: string | null
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
          blocked: boolean
          cpf: string
          created_at: string
          email: string
          email_verified: boolean
          full_name: string | null
          id: string
          invite_code: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          blocked?: boolean
          cpf: string
          created_at?: string
          email: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          invite_code?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          blocked?: boolean
          cpf?: string
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          invite_code?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total_price?: number
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
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          id: string
          payment_method: string | null
          payments: Json | null
          sale_id: string | null
          store_name: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string | null
          payments?: Json | null
          sale_id?: string | null
          store_name?: string | null
          total_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          payment_method?: string | null
          payments?: Json | null
          sale_id?: string | null
          store_name?: string | null
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
          created_at: string | null
          encrypted_token: string | null
          id: string
          integration_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_token?: string | null
          id?: string
          integration_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_token?: string | null
          id?: string
          integration_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          category: string | null
          commercial_phone: string | null
          created_at: string | null
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
          store_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string | null
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
          store_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          commercial_phone?: string | null
          created_at?: string | null
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
          store_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          days_to_add: number
          id: string
          mercado_pago_payment_id: string
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
          mercado_pago_payment_id: string
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
          mercado_pago_payment_id?: string
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
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_cpf_available_for_employee: {
        Args: { check_cpf: string }
        Returns: {
          available: boolean
          reason: string
        }[]
      }
      check_email_available_for_employee: {
        Args: { check_email: string }
        Returns: {
          available: boolean
          reason: string
        }[]
      }
      check_employee_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      get_employee_admin_id: { Args: { _user_id: string }; Returns: string }
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
      validate_invite_code: {
        Args: { code: string }
        Returns: {
          is_already_used: boolean
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

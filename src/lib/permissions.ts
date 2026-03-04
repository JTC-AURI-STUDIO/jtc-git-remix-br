// All permission keys in the system
export const PERMISSION_KEYS = {
  // Products
  access_products: "access_products",
  create_product: "create_product",
  edit_product: "edit_product",
  delete_product: "delete_product",

  // POS / Sales
  access_pos: "access_pos",

  // Customers
  access_customers: "access_customers",
  create_customer: "create_customer",
  edit_customer: "edit_customer",
  delete_customer: "delete_customer",

  // Suppliers
  access_suppliers: "access_suppliers",
  create_supplier: "create_supplier",
  edit_supplier: "edit_supplier",
  delete_supplier: "delete_supplier",

  // Sales History
  access_history: "access_history",

  // Reports
  access_reports: "access_reports",
  download_report: "download_report",

  // Settings
  access_settings: "access_settings",

  // Subscription
  access_subscription: "access_subscription",

  // Weekly Redemption
  access_redemption: "access_redemption",

  // Employees
  access_employees: "access_employees",
  create_employee: "create_employee",
  edit_employee: "edit_employee",
  delete_employee: "delete_employee",

} as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

// Human-readable labels for permissions, grouped by section
export const PERMISSION_GROUPS = [
  {
    label: "Produtos",
    permissions: [
      { key: PERMISSION_KEYS.access_products, label: "Acessar aba Produtos" },
      { key: PERMISSION_KEYS.create_product, label: "Cadastrar Produto" },
      { key: PERMISSION_KEYS.edit_product, label: "Editar Produto" },
      { key: PERMISSION_KEYS.delete_product, label: "Excluir Produto" },
    ],
  },
  {
    label: "Vendas (PDV)",
    permissions: [
      { key: PERMISSION_KEYS.access_pos, label: "Acessar aba Venda (PDV)" },
    ],
  },
  {
    label: "Clientes",
    permissions: [
      { key: PERMISSION_KEYS.access_customers, label: "Acessar aba Clientes" },
      { key: PERMISSION_KEYS.create_customer, label: "Cadastrar Cliente" },
      { key: PERMISSION_KEYS.edit_customer, label: "Editar Cliente" },
      { key: PERMISSION_KEYS.delete_customer, label: "Excluir Cliente" },
    ],
  },
  {
    label: "Fornecedores",
    permissions: [
      { key: PERMISSION_KEYS.access_suppliers, label: "Acessar aba Fornecedores" },
      { key: PERMISSION_KEYS.create_supplier, label: "Cadastrar Fornecedor" },
      { key: PERMISSION_KEYS.edit_supplier, label: "Editar Fornecedor" },
      { key: PERMISSION_KEYS.delete_supplier, label: "Excluir Fornecedor" },
    ],
  },
  {
    label: "Histórico",
    permissions: [
      { key: PERMISSION_KEYS.access_history, label: "Acessar aba Histórico de Vendas" },
    ],
  },
  {
    label: "Relatórios",
    permissions: [
      { key: PERMISSION_KEYS.access_reports, label: "Acessar aba Relatórios" },
      { key: PERMISSION_KEYS.download_report, label: "Baixar Relatório" },
    ],
  },
  {
    label: "Funcionários",
    permissions: [
      { key: PERMISSION_KEYS.access_employees, label: "Visualizar Funcionários" },
      { key: PERMISSION_KEYS.create_employee, label: "Criar Funcionário" },
      { key: PERMISSION_KEYS.edit_employee, label: "Editar Funcionário" },
      { key: PERMISSION_KEYS.delete_employee, label: "Excluir Funcionário" },
    ],
  },
  {
    label: "Configurações",
    permissions: [
      { key: PERMISSION_KEYS.access_settings, label: "Acessar Configurações" },
    ],
  },
  {
    label: "Assinatura",
    permissions: [
      { key: PERMISSION_KEYS.access_subscription, label: "Acessar Assinatura" },
    ],
  },
  {
    label: "Resgate Semanal",
    permissions: [
      { key: PERMISSION_KEYS.access_redemption, label: "Acessar Resgate Semanal" },
    ],
  },
];

// Map routes to required permissions
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/produtos": PERMISSION_KEYS.access_products,
  "/produtos/novo": PERMISSION_KEYS.create_product,
  "/produtos/editar": PERMISSION_KEYS.edit_product,
  "/pdv": PERMISSION_KEYS.access_pos,
  "/pdv/produtos": PERMISSION_KEYS.access_pos,
  "/pdv/clientes": PERMISSION_KEYS.access_pos,
  "/clientes": PERMISSION_KEYS.access_customers,
  "/clientes/novo": PERMISSION_KEYS.create_customer,
  "/clientes/editar": PERMISSION_KEYS.edit_customer,
  "/fornecedores": PERMISSION_KEYS.access_suppliers,
  "/fornecedores/novo": PERMISSION_KEYS.create_supplier,
  "/fornecedores/editar": PERMISSION_KEYS.edit_supplier,
  "/historico": PERMISSION_KEYS.access_history,
  "/relatorios": PERMISSION_KEYS.access_reports,
  "/funcionarios": PERMISSION_KEYS.access_employees,
  "/funcionarios/novo": PERMISSION_KEYS.create_employee,
  "/funcionarios/editar": PERMISSION_KEYS.edit_employee,
  "/configuracoes": PERMISSION_KEYS.access_settings,
  "/assinatura": PERMISSION_KEYS.access_subscription,
  "/resgate-semanal": PERMISSION_KEYS.access_redemption,
};

// Map quick action paths to required permissions
export const QUICK_ACTION_PERMISSIONS: Record<string, PermissionKey> = {
  "/produtos": PERMISSION_KEYS.access_products,
  "/pdv": PERMISSION_KEYS.access_pos,
  "/clientes": PERMISSION_KEYS.access_customers,
  "/fornecedores": PERMISSION_KEYS.access_suppliers,
  "/historico": PERMISSION_KEYS.access_history,
  "/relatorios": PERMISSION_KEYS.access_reports,
  "/configuracoes": PERMISSION_KEYS.access_settings,
  "/assinatura": PERMISSION_KEYS.access_subscription,
  "/resgate-semanal": PERMISSION_KEYS.access_redemption,
};

// Map menu items to required permissions
export const MENU_PERMISSIONS: Record<string, PermissionKey> = {
  "/produtos": PERMISSION_KEYS.access_products,
  "/pdv": PERMISSION_KEYS.access_pos,
  "/clientes": PERMISSION_KEYS.access_customers,
  "/fornecedores": PERMISSION_KEYS.access_suppliers,
  "/historico": PERMISSION_KEYS.access_history,
  "/relatorios": PERMISSION_KEYS.access_reports,
  "/funcionarios": PERMISSION_KEYS.access_employees,
  "/configuracoes": PERMISSION_KEYS.access_settings,
  "/assinatura": PERMISSION_KEYS.access_subscription,
  "/resgate-semanal": PERMISSION_KEYS.access_redemption,
};

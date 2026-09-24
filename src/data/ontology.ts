// Fourth Coffee - Sample Ontology for Microsoft Fabric IQ Demo

/** 计算属性的表达式定义 */
export interface ComputedExpression {
  /** 表达式类型: 聚合计算 | 公式计算 | 条件判断 */
  type: 'aggregation' | 'formula' | 'conditional';
  /**
   * 聚合型表达式配置
   * 例如: SUM(Customer → places → Order.total)
   */
  aggregation?: {
    function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
    /** 遍历关系路径 */
    traversal: {
      relationshipId: string;
      direction: 'outgoing' | 'incoming';
    };
    /** 目标实体属性（COUNT 时可选） */
    targetProperty?: string;
  };
  /**
   * 公式型表达式（引用自身属性做数学运算）
   * 例如: "(price - costPrice) / price"
   */
  formula?: string;
  /**
   * 条件型表达式
   * 例如: condition: "totalLifetimeValue >= 3000", thenValue: "Platinum", elseValue: "Gold"
   */
  conditional?: {
    condition: string;
    thenValue: string;
    elseValue: string;
  };
}

/** 属性约束规则（数据契约 / 验证规则） */
export interface PropertyConstraint {
  id: string;
  name?: string;
  type: 'range' | 'pattern' | 'length' | 'custom';
  severity: 'error' | 'warning' | 'info';
  message: string;
  range?: {
    min?: number;
    max?: number;
    exclusiveMin?: boolean;
    exclusiveMax?: boolean;
  };
  pattern?: string;
  length?: {
    min?: number;
    max?: number;
  };
  customExpression?: string;
}

/** 关系约束规则 */
export interface RelationshipConstraint {
  id: string;
  name?: string;
  type: 'cardinality-exact' | 'required' | 'custom';
  severity: 'error' | 'warning' | 'info';
  message: string;
  cardinalityRange?: {
    min?: number;
    max?: number;
  };
  customExpression?: string;
}

export interface Property {
  name: string;
  type: 'string' | 'integer' | 'decimal' | 'double' | 'date' | 'datetime' | 'boolean' | 'enum';
  isIdentifier?: boolean;
  unit?: string;
  values?: string[];
  description?: string;
  isComputed?: boolean;
  expression?: ComputedExpression;
  isRequired?: boolean;
  constraints?: PropertyConstraint[];
}

export interface RelationshipAttribute {
  name: string;
  type: string;
}

export interface Relationship {
  id: string;
  name: string;
  from: string;
  to: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  description?: string;
  attributes?: RelationshipAttribute[];
  constraints?: RelationshipConstraint[];
}

export interface EntityType {
  id: string;
  name: string;
  description: string;
  properties: Property[];
  icon: string;
  color: string;
}

export interface EntityInstance {
  id: string;
  entityTypeId: string;
  values: Record<string, unknown>;
}

export interface Ontology {
  name: string;
  description: string;
  entityTypes: EntityType[];
  relationships: Relationship[];
}

export interface DataBinding {
  entityTypeId: string;
  source: string;
  table: string;
  columnMappings: Record<string, string>;
}

// The Fourth Coffee Ontology
export const cosmicCoffeeOntology: Ontology = {
  name: "Fourth Coffee",
  description: "A sample ontology representing a modern coffee shop chain with suppliers, products, stores, customers, and orders.",
  entityTypes: [
    {
      id: "customer",
      name: "Customer",
      description: "A person who purchases coffee products from our stores",
      icon: "👤",
      color: "#0078D4", // Microsoft Blue
      properties: [
        {
          name: "customerId",
          type: "string",
          isIdentifier: true,
          isRequired: true,
          description: "Unique customer identifier",
          constraints: [
            { id: "cst-cust-id", name: "ID格式规范", type: "pattern", severity: "error", pattern: "^CUST-\\d{3}$", message: "客户编号必须符合 CUST-xxx 规范" }
          ]
        },
        {
          name: "name",
          type: "string",
          isRequired: true,
          description: "Full name of the customer",
          constraints: [
            { id: "cst-cust-name", name: "姓名长度", type: "length", severity: "warning", length: { min: 2, max: 100 }, message: "姓名长度应在 2 至 100 个字符之间" }
          ]
        },
        {
          name: "email",
          type: "string",
          isRequired: true,
          description: "Contact email address",
          constraints: [
            { id: "cst-cust-email", name: "邮箱有效性", type: "pattern", severity: "error", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message: "必须是合法的电子邮件地址" }
          ]
        },
        { name: "loyaltyTier", type: "enum", values: ["Bronze", "Silver", "Gold", "Platinum"], description: "Loyalty program tier" },
        { name: "joinDate", type: "date", description: "Date the customer joined" },
        { name: "totalSpend", type: "decimal", unit: "USD", description: "Lifetime spend amount (legacy static field)" },
        // 计算属性
        {
          name: "totalLifetimeValue",
          type: "decimal",
          isComputed: true,
          unit: "USD",
          description: "客户历史消费总额 (动态聚合汇总)",
          expression: {
            type: "aggregation",
            aggregation: {
              function: "SUM",
              traversal: { relationshipId: "customer_places_order", direction: "outgoing" },
              targetProperty: "total"
            }
          }
        },
        {
          name: "orderCount",
          type: "integer",
          isComputed: true,
          description: "客户累计下单笔数",
          expression: {
            type: "aggregation",
            aggregation: {
              function: "COUNT",
              traversal: { relationshipId: "customer_places_order", direction: "outgoing" }
            }
          }
        },
        {
          name: "avgOrderValue",
          type: "decimal",
          isComputed: true,
          unit: "USD",
          description: "客户平均单笔客单价",
          expression: {
            type: "aggregation",
            aggregation: {
              function: "AVG",
              traversal: { relationshipId: "customer_places_order", direction: "outgoing" },
              targetProperty: "total"
            }
          }
        },
        {
          name: "derivedTier",
          type: "enum",
          values: ["Bronze", "Silver", "Gold", "Platinum"],
          isComputed: true,
          description: "动态会员等级 (根据终身价值动态判定)",
          expression: {
            type: "conditional",
            conditional: {
              condition: "totalLifetimeValue >= 3000",
              thenValue: "Platinum",
              elseValue: "totalLifetimeValue >= 1000 ? Gold : Silver"
            }
          }
        }
      ]
    },
    {
      id: "order",
      name: "Order",
      description: "A customer purchase transaction at a store",
      icon: "🧾",
      color: "#107C10", // Microsoft Green
      properties: [
        { name: "orderId", type: "string", isIdentifier: true, isRequired: true, description: "Unique order identifier" },
        { name: "timestamp", type: "datetime", description: "When the order was placed" },
        {
          name: "total",
          type: "decimal",
          unit: "USD",
          isRequired: true,
          description: "Total order amount",
          constraints: [
            { id: "cst-order-total", name: "金额非负校验", type: "range", severity: "error", range: { min: 0 }, message: "订单总金额必须大于等于 0" }
          ]
        },
        { name: "status", type: "enum", values: ["Pending", "Preparing", "Ready", "Completed", "Cancelled"], description: "Current order status" },
        { name: "paymentMethod", type: "enum", values: ["Card", "Cash", "Mobile", "Gift Card"], description: "Payment method used" },
        {
          name: "itemCount",
          type: "integer",
          isComputed: true,
          description: "订单内商品总件数",
          expression: {
            type: "aggregation",
            aggregation: {
              function: "SUM",
              traversal: { relationshipId: "order_contains_product", direction: "outgoing" },
              targetProperty: "quantity"
            }
          }
        }
      ]
    },
    {
      id: "product",
      name: "Product",
      description: "A coffee product or item available for sale",
      icon: "☕",
      color: "#5C2D91", // Microsoft Purple
      properties: [
        { name: "productId", type: "string", isIdentifier: true, isRequired: true, description: "Unique product identifier" },
        { name: "name", type: "string", isRequired: true, description: "Product name" },
        { name: "category", type: "enum", values: ["Espresso", "Brewed", "Cold Brew", "Tea", "Food", "Merchandise"], description: "Product category" },
        {
          name: "price",
          type: "decimal",
          unit: "USD",
          isRequired: true,
          description: "Unit price",
          constraints: [
            { id: "cst-prod-price", name: "单价合理范围", type: "range", severity: "error", range: { min: 0.1, max: 1000 }, message: "商品单价需在 0.1 至 1000 USD 之间" }
          ]
        },
        { name: "origin", type: "string", description: "Coffee bean origin country" },
        { name: "isOrganic", type: "boolean", description: "Whether the product is certified organic" }
      ]
    },
    {
      id: "store",
      name: "Store",
      description: "A physical coffee shop location",
      icon: "🏪",
      color: "#FFB900", // Microsoft Yellow/Gold
      properties: [
        { name: "storeId", type: "string", isIdentifier: true, isRequired: true, description: "Unique store identifier" },
        { name: "name", type: "string", isRequired: true, description: "Store name" },
        { name: "city", type: "string", description: "City location" },
        { name: "state", type: "string", description: "State/Province" },
        { name: "openDate", type: "date", description: "Store opening date" },
        {
          name: "capacity",
          type: "integer",
          description: "Seating capacity",
          constraints: [
            { id: "cst-store-cap", name: "容纳人数区间", type: "range", severity: "warning", range: { min: 1, max: 500 }, message: "门店容纳人数通常在 1 至 500 人之间" }
          ]
        },
        {
          name: "totalRevenue",
          type: "decimal",
          isComputed: true,
          unit: "USD",
          description: "门店累计营收总额",
          expression: {
            type: "aggregation",
            aggregation: {
              function: "SUM",
              traversal: { relationshipId: "order_processed_at_store", direction: "incoming" },
              targetProperty: "total"
            }
          }
        }
      ]
    },
    {
      id: "supplier",
      name: "Supplier",
      description: "A coffee bean or goods supplier partner",
      icon: "🚚",
      color: "#D83B01", // Microsoft Orange
      properties: [
        { name: "supplierId", type: "string", isIdentifier: true, isRequired: true, description: "Unique supplier identifier" },
        { name: "name", type: "string", isRequired: true, description: "Supplier company name" },
        { name: "country", type: "string", description: "Country of operation" },
        { name: "certification", type: "enum", values: ["Fair Trade", "Rainforest Alliance", "Organic", "Direct Trade", "None"], description: "Sustainability certification" },
        {
          name: "rating",
          type: "decimal",
          isRequired: true,
          description: "Quality rating (1-5)",
          constraints: [
            { id: "cst-supp-rating", name: "评分区间有效性", type: "range", severity: "error", range: { min: 1.0, max: 5.0 }, message: "供应商评级分值范围必须在 1.0 至 5.0 之间" }
          ]
        }
      ]
    },
    {
      id: "shipment",
      name: "Shipment",
      description: "A delivery of goods from supplier to store",
      icon: "📦",
      color: "#00A9E0", // Light Blue
      properties: [
        { name: "shipmentId", type: "string", isIdentifier: true, isRequired: true, description: "Unique shipment identifier" },
        { name: "dispatchDate", type: "date", description: "Date shipped from supplier" },
        { name: "arrivalDate", type: "date", description: "Date arrived at store" },
        { name: "status", type: "enum", values: ["In Transit", "Delivered", "Delayed"], description: "Shipment status" },
        { name: "weight", type: "decimal", unit: "kg", description: "Total shipment weight" }
      ]
    }
  ],
  relationships: [
    {
      id: "customer_places_order",
      name: "places",
      from: "customer",
      to: "order",
      cardinality: "one-to-many",
      description: "A customer places one or more orders",
      constraints: [
        { id: "rel-cst-cust-order", name: "客户订单基数", type: "cardinality-exact", severity: "info", message: "每个客户可以有 0 到多笔历史订单", cardinalityRange: { min: 0 } }
      ]
    },
    {
      id: "order_contains_product",
      name: "contains",
      from: "order",
      to: "product",
      cardinality: "many-to-many",
      description: "An order contains one or more products",
      attributes: [
        { name: "quantity", type: "integer" },
        { name: "customizations", type: "string" }
      ],
      constraints: [
        { id: "rel-cst-order-prod", name: "订单商品不可为空", type: "required", severity: "error", message: "每笔订单必须至少包含 1 种商品", cardinalityRange: { min: 1 } }
      ]
    },
    {
      id: "order_processed_at_store",
      name: "processedAt",
      from: "order",
      to: "store",
      cardinality: "many-to-one",
      description: "An order is processed at a specific store"
    },
    {
      id: "product_sourced_from_supplier",
      name: "sourcedFrom",
      from: "product",
      to: "supplier",
      cardinality: "many-to-one",
      description: "A product's ingredients are sourced from a supplier"
    },
    {
      id: "shipment_from_supplier",
      name: "sentBy",
      from: "shipment",
      to: "supplier",
      cardinality: "many-to-one",
      description: "A shipment is sent by a supplier"
    },
    {
      id: "shipment_to_store",
      name: "deliveredTo",
      from: "shipment",
      to: "store",
      cardinality: "many-to-one",
      description: "A shipment is delivered to a store"
    },
    {
      id: "shipment_contains_product",
      name: "carries",
      from: "shipment",
      to: "product",
      cardinality: "many-to-many",
      description: "A shipment carries products",
      attributes: [
        { name: "quantity", type: "integer" }
      ]
    }
  ]
};

// Sample entity instances for demonstration
export const sampleInstances: EntityInstance[] = [
  // Customers
  { id: "cust-001", entityTypeId: "customer", values: { customerId: "CUST-001", name: "Arif Ramadhan", email: "customer001@example.com", loyaltyTier: "Gold", joinDate: "2024-03-15", totalSpend: 1245.50 }},
  { id: "cust-002", entityTypeId: "customer", values: { customerId: "CUST-002", name: "Jaroslav Cerny", email: "customer002@example.com", loyaltyTier: "Platinum", joinDate: "2023-01-20", totalSpend: 3420.00 }},
  { id: "cust-003", entityTypeId: "customer", values: { customerId: "CUST-003", name: "Sumber Agvaan", email: "customer003@example.com", loyaltyTier: "Bronze", joinDate: "2025-11-01", totalSpend: 89.00 }},
  
  // Products
  { id: "prod-001", entityTypeId: "product", values: { productId: "PROD-001", name: "Ethiopian Single Origin", category: "Brewed", price: 4.50, origin: "Ethiopia", isOrganic: true }},
  { id: "prod-002", entityTypeId: "product", values: { productId: "PROD-002", name: "Colombian Latte", category: "Espresso", price: 5.75, origin: "Colombia", isOrganic: false }},
  { id: "prod-003", entityTypeId: "product", values: { productId: "PROD-003", name: "Nebula Cold Brew", category: "Cold Brew", price: 5.25, origin: "Guatemala", isOrganic: true }},
  
  // Stores
  { id: "store-001", entityTypeId: "store", values: { storeId: "STORE-001", name: "Fourth Coffee - Downtown Seattle", city: "Seattle", state: "WA", openDate: "2022-06-15", capacity: 45 }},
  { id: "store-002", entityTypeId: "store", values: { storeId: "STORE-002", name: "Fourth Coffee - Capitol Hill", city: "Seattle", state: "WA", openDate: "2023-02-28", capacity: 32 }},
  
  // Suppliers
  { id: "supp-001", entityTypeId: "supplier", values: { supplierId: "SUPP-001", name: "Ethiopia Highlands Farm", country: "Ethiopia", certification: "Fair Trade", rating: 4.8 }},
  { id: "supp-002", entityTypeId: "supplier", values: { supplierId: "SUPP-002", name: "Colombian Mountain Roasters", country: "Colombia", certification: "Rainforest Alliance", rating: 4.6 }},
  
  // Orders
  { id: "order-001", entityTypeId: "order", values: { orderId: "ORD-2025-001", timestamp: "2025-01-28T09:15:00", total: 12.50, status: "Completed", paymentMethod: "Mobile" }},
  { id: "order-002", entityTypeId: "order", values: { orderId: "ORD-2025-002", timestamp: "2025-01-28T10:30:00", total: 8.75, status: "Preparing", paymentMethod: "Card" }},
  
  // Shipments
  { id: "ship-001", entityTypeId: "shipment", values: { shipmentId: "SHIP-001", dispatchDate: "2025-01-20", arrivalDate: "2025-01-27", status: "Delivered", weight: 250.5 }},
];

// Sample data bindings showing connection to a data lakehouse platform
export const sampleBindings: DataBinding[] = [
  {
    entityTypeId: "customer",
    source: "Data Lakehouse",
    table: "lakehouse.bronze.customers",
    columnMappings: {
      customerId: "customer_id",
      name: "full_name",
      email: "email_address",
      loyaltyTier: "loyalty_status",
      joinDate: "registration_date",
      totalSpend: "lifetime_value"
    }
  },
  {
    entityTypeId: "order",
    source: "Data Lakehouse",
    table: "lakehouse.silver.orders",
    columnMappings: {
      orderId: "order_id",
      timestamp: "order_timestamp",
      total: "order_total",
      status: "order_status",
      paymentMethod: "payment_type"
    }
  },
  {
    entityTypeId: "product",
    source: "Semantic model",
    table: "semantic_model.Products",
    columnMappings: {
      productId: "ProductKey",
      name: "ProductName",
      category: "ProductCategory",
      price: "UnitPrice",
      origin: "OriginCountry"
    }
  }
];

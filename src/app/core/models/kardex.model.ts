export interface Customer {
  id: string;
  name: string;
  address?: string;
  contact_phone?: string;
}

export interface User {
  name: string;
  dni: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  min_stock: number;
  current_stock: number;
  unit_price: number;
}

export interface PurchaseOrder {
  id: string;
  customer_id: string;
  product_id: string;
  oc_number: string;
  total_quantity: number;
  delivered_quantity: number;
  status: 'OPEN' | 'CLOSED';
  created_at: Date;
  product_name?: string; // Para visualización
}

export interface Movement {
  id?: string;
  date?: Date;
  product_id: string; // Relación fuerte
  purchase_order_id?: string;
  productCode?: string;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  reference: string;
  unit_cost: number;
  total_cost?: number;
  operator?: string;
  customer_id?: string;
  customerName?: string; // Para mostrarlo fácil en tablas
  truck_plate?: string;
  driver_name?: string;
  oc_date?: string;
  remission_guide?: string;
  remission_date?: string;
  delivery_date?: string;
  proceso?: string;
  invoice_number?: string;
  invoice_date?: string;
  
  // NUEVOS DATOS: Finanzas
  subtotal?: number;
  igv_amount?: number;
  total_invoice?: number;
  retention_amount?: number;
  detraction_pct?: number;
  detraction_amount?: number;
  
}
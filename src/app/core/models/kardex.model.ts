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

export interface Movement {
  id?: string;
  date?: Date;
  product_id: string; // Relación fuerte
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
}
import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movement, Product, User, Customer, PurchaseOrder } from '../models/kardex.model'; 
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class KardexService {
  private supabase: SupabaseClient;
  private zone = inject(NgZone); 
  
  // --- AUTENTICACIÓN CON PERSISTENCIA ---
  currentUser = signal<User | null>(this.getUserFromStorage());
  
  private getUserFromStorage(): User | null {
    const savedUser = localStorage.getItem('gra_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  }

  login(user: User) {
    localStorage.setItem('gra_user_session', JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout() {
    localStorage.removeItem('gra_user_session');
    this.currentUser.set(null);
  }

  // --- ESTADO PRINCIPAL (Signals) ---
  products = signal<Product[]>([]);
  movements = signal<Movement[]>([]);
  customers = signal<Customer[]>([]); 
  purchaseOrders = signal<PurchaseOrder[]>([]);
  isLoading = signal<boolean>(false);

  // --- ESTADO UI / MODAL ---
  activeProduct = signal<Product | null>(null);
  activePurchaseOrder = signal<PurchaseOrder | null>(null);
  movementType = signal<'ENTRY' | 'EXIT'>('ENTRY');

  // --- VALORES COMPUTADOS (Inventario y Movimientos) ---
  totalValue = computed(() => 
    this.products().reduce((acc, p) => acc + (p.current_stock * p.unit_price), 0)
  );
  lowStockCount = computed(() => 
    this.products().filter(p => p.current_stock <= p.min_stock).length
  );
  totalItems = computed(() => 
    this.products().reduce((acc, p) => acc + p.current_stock, 0)
  );
  sortedMovements = computed(() => 
    [...this.movements()].sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
  );

  // --- CÁLCULOS FINANCIEROS (Inversión, Ventas, Utilidad) ---
  totalInversion = computed(() => 
    this.movements()
      .filter(m => m.type === 'ENTRY')
      .reduce((acc, m) => acc + Number(m.total_cost || 0), 0)
  );

  totalVentas = computed(() => 
    this.movements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => acc + Number(m.subtotal || m.total_cost || 0), 0)
  );

  totalFacturadoConIgv = computed(() => 
    this.movements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => acc + Number(m.total_invoice || m.total_cost || 0), 0)
  );

  totalUtilidad = computed(() => 
    this.movements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => {
        const ingresoNeto = Number(m.subtotal || m.total_cost || 0); 
        const costoReal = Number(m.quantity) * Number((m as any).baseCost || 0); 
        return acc + (ingresoNeto - costoReal);
      }, 0)
  );

  flujoCaja = computed(() => this.totalVentas() - this.totalInversion());

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.loadInitialData();
  }

  // --- CARGA INICIAL DE DATOS ---
  async loadInitialData() {
    this.isLoading.set(true);
    try {
      // Cargar Productos
      const { data: prods } = await this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Cargar Movimientos con Join a Productos
      const { data: movs } = await this.supabase
        .from('movements')
        .select('*, products(code, unit_price)') 
        .order('date', { ascending: false })
        .limit(100);
      
      const formattedMovs = movs?.map(m => ({
        ...m,
        productCode: m.products?.code,
        baseCost: m.products?.unit_price 
      })) || [];

      // Cargar Clientes
      const { data: custs } = await this.supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      // Cargar Órdenes de Compra con Join a Productos
      const { data: ocs } = await this.supabase
        .from('purchase_orders')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

      this.zone.run(() => {
        this.products.set(prods || []);
        this.movements.set(formattedMovs);
        this.customers.set(custs || []);
        this.purchaseOrders.set(ocs?.map(oc => ({
          ...oc,
          product_name: oc.products?.name
        })) || []);
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.zone.run(() => this.isLoading.set(false));
    }
  }

  // --- GESTIÓN DE ÓRDENES DE COMPRA ---
  async addPurchaseOrder(ocData: any) {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .insert([ocData])
      .select('*, products(name)')
      .single();
    
    if (!error) {
      this.zone.run(() => {
        const newOc = { ...data, product_name: data.products?.name };
        this.purchaseOrders.update(prev => [newOc, ...prev]);
      });
    }
  }

  // --- GESTIÓN DE PRODUCTOS ---
  async addProduct(productData: Partial<Product>) {
    const { data, error } = await this.supabase
      .from('products')
      .insert([{ ...productData, current_stock: 0 }])
      .select()
      .single();
    if (!error) this.zone.run(() => this.products.update(prev => [data, ...prev]));
  }

  async updateProduct(id: string, productData: Partial<Product>) {
    const { data, error } = await this.supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    if (!error) this.zone.run(() => this.products.update(prev => prev.map(p => p.id === id ? data : p)));
  }

  async deleteProduct(id: string) {
    const { error } = await this.supabase.from('products').delete().eq('id', id);
    if (!error) {
      this.zone.run(() => {
        this.products.update(prev => prev.filter(p => p.id !== id));
        this.movements.update(prev => prev.filter(m => m.product_id !== id));
      });
    }
  }

  // --- GESTIÓN DE MOVIMIENTOS ---
  openMovement(product: Product, type: 'ENTRY' | 'EXIT', oc?: PurchaseOrder) {
    this.activeProduct.set(product);
    this.movementType.set(type);
    this.activePurchaseOrder.set(oc || null);
  }

  closeMovementModal() {
    this.activeProduct.set(null);
    this.activePurchaseOrder.set(null);
  }

  // --- GESTIÓN DE CLIENTES ---
  async addCustomer(name: string, address?: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert([{ name, address }])
      .select()
      .single();
    
    if (!error) {
      this.zone.run(() => {
        this.customers.update(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      });
      return data.id;
    }
    return null;
  }

  // --- PROCESAMIENTO DE MOVIMIENTOS CON AUTOMATIZACIÓN DE OC ---
  async processMovement(
    reference: string, 
    quantity: number, 
    unit_cost: number,
    logisticData?: any,
    financialData?: any
  ) {
    const product = this.activeProduct();
    const oc = this.activePurchaseOrder();
    const type = this.movementType();
    const operator = this.currentUser()?.name || 'Desconocido';
    if (!product) return;

    try {
      const movementPayload = {
        product_id: product.id,
        purchase_order_id: oc?.id || null, // Vínculo con la OC
        type,
        quantity,
        reference,
        unit_cost,
        operator,
        customer_id: logisticData?.customer_id || null,
        truck_plate: logisticData?.truck_plate?.toUpperCase() || null,
        driver_name: logisticData?.driver_name || null,
        oc_date: logisticData?.oc_date || null,
        remission_guide: logisticData?.remission_guide || null,
        remission_date: logisticData?.remission_date || null,
        delivery_date: logisticData?.delivery_date || null,
        proceso: logisticData?.proceso || null,
        invoice_number: logisticData?.invoice_number || null,
        invoice_date: logisticData?.invoice_date || null,
        subtotal: financialData?.subtotal || null,
        igv_amount: financialData?.igv || null,
        total_invoice: financialData?.totalFactura || null,
        retention_amount: financialData?.retencion || null,
        detraction_pct: financialData?.detraction_pct || null,
        detraction_amount: financialData?.detraccion || null
      };

      // 1. Registrar Movimiento
      const { data: movData, error: movError } = await this.supabase
        .from('movements')
        .insert([movementPayload])
        .select('*, products(code, unit_price)') 
        .single();
      if (movError) throw movError;

      // 2. AUTOMATIZACIÓN: Si hay una OC activa y es una SALIDA, actualizamos la cantidad entregada
      if (oc && type === 'EXIT') {
        const newDelivered = (oc.delivered_quantity || 0) + quantity;
        const { error: ocError } = await this.supabase
          .from('purchase_orders')
          .update({ delivered_quantity: newDelivered })
          .eq('id', oc.id);
        
        if (!ocError) {
          this.zone.run(() => {
            this.purchaseOrders.update(prev => 
              prev.map(item => item.id === oc.id ? { ...item, delivered_quantity: newDelivered } : item)
            );
          });
        }
      }

      // 3. Actualizar señales locales de movimientos y productos
      const formattedMov = { 
        ...movData, 
        productCode: movData.products?.code,
        baseCost: movData.products?.unit_price 
      };
      
      const { data: prodData } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();

      this.zone.run(() => {
        this.movements.update(prev => [formattedMov, ...prev]);
        if (prodData) {
          this.products.update(prev => prev.map(p => p.id === product.id ? prodData : p));
        }
        this.closeMovementModal();
      });

    } catch (error) {
      console.error('Error procesando movimiento:', error);
      alert('Error: No se pudo completar el registro.');
    }
  }
}
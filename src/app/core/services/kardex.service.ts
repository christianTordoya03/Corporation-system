import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movement, Product, User, Customer } from '../models/kardex.model'; 
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class KardexService {
  private supabase: SupabaseClient;
  private zone = inject(NgZone); 
  
  // --- AUTENTICACIÓN CON PERSISTENCIA ---
  // Al inicializar la señal, intentamos cargar al usuario desde localStorage
  currentUser = signal<User | null>(this.getUserFromStorage());
  
  private getUserFromStorage(): User | null {
    const savedUser = localStorage.getItem('gra_user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  }

  login(user: User) {
    // Guardamos en localStorage para que sobreviva al F5 (Refresh)
    localStorage.setItem('gra_user_session', JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout() {
    // Limpiamos el almacenamiento al salir
    localStorage.removeItem('gra_user_session');
    this.currentUser.set(null);
  }

  // --- ESTADO PRINCIPAL (Signals) ---
  products = signal<Product[]>([]);
  movements = signal<Movement[]>([]);
  customers = signal<Customer[]>([]); 
  isLoading = signal<boolean>(false);

  // --- ESTADO UI ---
  activeProduct = signal<Product | null>(null);
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
      const { data: prods, error: errProds } = await this.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (errProds) throw errProds;
      
      const { data: movs, error: errMovs } = await this.supabase
        .from('movements')
        .select('*, products(code, unit_price)') 
        .order('date', { ascending: false })
        .limit(100);
      if (errMovs) throw errMovs;
      
      const formattedMovs = movs.map(m => ({
        ...m,
        productCode: m.products?.code,
        baseCost: m.products?.unit_price 
      }));

      const { data: custs, error: errCusts } = await this.supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      if (errCusts) throw errCusts;

      this.zone.run(() => {
        this.products.set(prods || []);
        this.movements.set(formattedMovs || []);
        this.customers.set(custs || []);
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.zone.run(() => this.isLoading.set(false));
    }
  }

  // --- GESTIÓN DE PRODUCTOS ---
  async addProduct(productData: Partial<Product>) {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .insert([{ ...productData, current_stock: 0 }])
        .select()
        .single();
      if (error) throw error;
      
      this.zone.run(() => this.products.update(prev => [data, ...prev]));
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto.');
    }
  }

  async updateProduct(id: string, productData: Partial<Product>) {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      this.zone.run(() => this.products.update(prev => prev.map(p => p.id === id ? data : p)));
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      alert('Error al actualizar.');
    }
  }

  async deleteProduct(id: string) {
    try {
      const { error } = await this.supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      this.zone.run(() => {
        this.products.update(prev => prev.filter(p => p.id !== id));
        this.movements.update(prev => prev.filter(m => m.product_id !== id));
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar.');
    }
  }

  // --- GESTIÓN DE MOVIMIENTOS ---
  openMovement(product: Product, type: 'ENTRY' | 'EXIT') {
    this.activeProduct.set(product);
    this.movementType.set(type);
  }

  closeMovementModal() {
    this.activeProduct.set(null);
  }

  // --- GESTIÓN DE CLIENTES ---
  async addCustomer(name: string, address?: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .insert([{ name, address }])
        .select()
        .single();
      if (error) throw error;
      
      this.zone.run(() => {
        this.customers.update(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      });
      return data.id;
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar el nuevo cliente.');
      return null;
    }
  }

  async processMovement(
    reference: string, 
    quantity: number, 
    unit_cost: number,
    logisticData?: any,
    financialData?: any
  ) {
    const product = this.activeProduct();
    const type = this.movementType();
    const operator = this.currentUser()?.name || 'Desconocido';
    if (!product) return;

    try {
      const movementPayload = {
        product_id: product.id,
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

      const { data: movData, error: movError } = await this.supabase
        .from('movements')
        .insert([movementPayload])
        .select('*, products(code, unit_price)') 
        .single();
      if (movError) throw movError;

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
      alert('No se pudo registrar el movimiento.');
    }
  }
}
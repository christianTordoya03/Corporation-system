import { Component, inject, ViewChild, ElementRef, AfterViewInit, effect, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common'; 
import { KardexService } from '../../core/services/kardex.service';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx-js-style'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  providers: [CurrencyPipe],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  kardex = inject(KardexService);
  currencyPipe = inject(CurrencyPipe); 
  chart: any;
  @ViewChild('profitChart') chartRef!: ElementRef;

  selectedProductId = signal<string>('ALL');

  filteredProducts = computed(() => {
    const pid = this.selectedProductId();
    if (pid === 'ALL') return this.kardex.products();
    return this.kardex.products().filter(p => p.id === pid);
  });

  filteredMovements = computed(() => {
    const pid = this.selectedProductId();
    if (pid === 'ALL') return this.kardex.movements();
    return this.kardex.movements().filter(m => m.product_id === pid);
  });

  dashTotalValue = computed(() => this.filteredProducts().reduce((acc, p) => acc + (p.current_stock * p.unit_price), 0));
  dashLowStock = computed(() => this.filteredProducts().filter(p => p.current_stock <= p.min_stock).length);
  dashTotalItems = computed(() => this.filteredProducts().reduce((acc, p) => acc + p.current_stock, 0));

  dashInversion = computed(() => this.filteredMovements().filter(m => m.type === 'ENTRY').reduce((acc, m) => acc + Number(m.total_cost || 0), 0));
  dashVentas = computed(() => this.filteredMovements().filter(m => m.type === 'EXIT').reduce((acc, m) => acc + Number(m.total_cost || 0), 0));
  dashUtilidad = computed(() => this.filteredMovements().filter(m => m.type === 'EXIT').reduce((acc, m) => {
    const ingresoVenta = Number(m.total_cost || 0); 
    const costoReal = Number(m.quantity) * Number((m as any).baseCost || 0); 
    return acc + (ingresoVenta - costoReal);
  }, 0));

  constructor() {
    effect(() => {
      const inversion = this.dashInversion();
      const ventas = this.dashVentas();
      const utilidad = this.dashUtilidad();
      if (this.chart) {
        this.chart.data.datasets[0].data = [inversion, ventas, utilidad];
        this.chart.update();
      }
    });
  }

  onFilterChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedProductId.set(selectElement.value);
  }

  exportExecutiveReport() {
    if (this.filteredProducts().length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws_data: any[] = [];

    // --- Definición de Estilos ---
    const s_title = { font: { bold: true, size: 16, color: { rgb: "1E293B" } }, alignment: { horizontal: "center" } };
    const s_date = { font: { size: 10, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } };
    const base_box = { font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
    
    // Colores corporativos G.R.A.
    const s_box_inv = { ...base_box, fill: { fgColor: { rgb: "7E22CE" } }, font: { bold: true, size: 14, color: { rgb: "FFFFFF" } } };
    const s_box_inv_title = { ...base_box, fill: { fgColor: { rgb: "6B21A8" } }, font: { size: 10, color: { rgb: "F3E8FF" } } };
    const s_box_ven = { ...base_box, fill: { fgColor: { rgb: "22C55E" } }, font: { bold: true, size: 14, color: { rgb: "FFFFFF" } } };
    const s_box_ven_title = { ...base_box, fill: { fgColor: { rgb: "16A34A" } }, font: { size: 10, color: { rgb: "DCFCE7" } } };
    const s_box_util = { ...base_box, fill: { fgColor: { rgb: "F59E0B" } }, font: { bold: true, size: 14, color: { rgb: "FFFFFF" } } };
    const s_box_util_title = { ...base_box, fill: { fgColor: { rgb: "D97706" } }, font: { size: 10, color: { rgb: "FEF3C7" } } };

    // Estilo para encabezado de tabla detallada
    const s_header = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "334155" } }, alignment: { horizontal: "center", vertical: "center" } };
    const s_cell_border = { border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };

    // 1. Título y Fecha
    ws_data.push([{ v: "G.R.A. GRUPO CORPORATIVO - REPORTE GERENCIAL", s: s_title }]);
    const fechaText = `Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    ws_data.push([{ v: fechaText, s: s_date }]);
    ws_data.push([]); 

    // 2. Cuadros Financieros Globales
    ws_data.push([
      { v: "INVERSIÓN GLOBAL (COMPRAS)", s: s_box_inv_title }, null, 
      { v: "VENTAS GLOBALES (INGRESOS)", s: s_box_ven_title }, null,
      { v: "UTILIDAD NETA GLOBAL", s: s_box_util_title }, null, null
    ]);
    
    // Convertimos a texto con formato solo para las cajas superiores
    const fmt = (val: number) => this.currencyPipe.transform(val, 'S/ ') || 'S/ 0.00';
    ws_data.push([
      { v: fmt(this.dashInversion()), s: s_box_inv }, null,
      { v: fmt(this.dashVentas()), s: s_box_ven }, null,
      { v: fmt(this.dashUtilidad()), s: s_box_util }, null, null
    ]);
    
    ws_data.push([]); ws_data.push([]);

    // 3. NUEVO: Tabla de Desglose Analítico por Producto
    ws_data.push([{ v: "DESGLOSE FÍSICO Y FINANCIERO POR PRODUCTO", s: { font: { bold: true, size: 12, color: { rgb: "1E293B" } } } }]);
    ws_data.push([
      { v: "CÓDIGO", s: s_header },
      { v: "PRODUCTO", s: s_header },
      { v: "STOCK ACT.", s: s_header },
      { v: "ESTADO", s: s_header },
      { v: "INVERSIÓN (S/)", s: s_header },
      { v: "VENTAS (S/)", s: s_header },
      { v: "UTILIDAD (S/)", s: s_header }
    ]);

    // Recorremos producto por producto calculando sus métricas individuales
    this.filteredProducts().forEach(p => {
      let estado = 'Óptimo';
      let colorEstado = "16A34A"; // Verde
      if(p.current_stock <= p.min_stock) {
        estado = 'Crítico';
        colorEstado = "DC2626"; // Rojo
      } else if(p.current_stock <= p.min_stock * 2) {
        estado = 'Reponer';
        colorEstado = "D97706"; // Ambar
      }

      // Filtramos solo los movimientos de ESTE producto
      const pMovs = this.filteredMovements().filter(m => m.product_id === p.id);
      
      // Calculamos finanzas individuales
      const pInv = pMovs.filter(m => m.type === 'ENTRY').reduce((acc, m) => acc + Number(m.total_cost || 0), 0);
      const pVen = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => acc + Number(m.total_cost || 0), 0);
      const pUtil = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => {
        const ingreso = Number(m.total_cost || 0);
        const costo = Number(m.quantity) * Number((m as any).baseCost || 0);
        return acc + (ingreso - costo);
      }, 0);

      ws_data.push([
        { v: p.code, s: { ...s_cell_border, font: { name: "Courier New" }, alignment: { horizontal: "center" } } },
        { v: p.name, s: { ...s_cell_border } },
        { v: p.current_stock, s: { ...s_cell_border, alignment: { horizontal: "center" }, font: { bold: true } } },
        { v: estado, s: { ...s_cell_border, alignment: { horizontal: "center" }, font: { color: { rgb: colorEstado }, bold: true } } },
        { v: pInv, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } }, // Formato nativo Excel
        { v: pVen, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } },
        { v: pUtil, s: { ...s_cell_border, alignment: { horizontal: "right" }, font: { bold: true }, z: '"S/" #,##0.00' } }
      ]);
    });

    // 4. Generar la hoja y configurar anchos/combinaciones
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Título principal (A1:G1)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Fecha (A2:G2)
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Caja Inversión
      { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, // Caja Ventas
      { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } }, { s: { r: 4, c: 4 }, e: { r: 4, c: 6 } }  // Caja Utilidad
    ];

    ws['!cols'] = [
      { wch: 15 }, // Codigo
      { wch: 25 }, // Producto
      { wch: 12 }, // Stock
      { wch: 12 }, // Estado
      { wch: 18 }, // Inversion
      { wch: 18 }, // Ventas
      { wch: 18 }  // Utilidad
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Gerencial');
    XLSX.writeFile(wb, `Reporte_Estadístico_${new Date().getTime()}.xlsx`);
  }

  ngAfterViewInit() { setTimeout(() => { this.initChart(); }, 50); }

  initChart() {
    if (this.chart) { this.chart.destroy(); }
    const ctx = this.chartRef.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Inversión (S/)', 'Ventas (S/)', 'Utilidad Neta (S/)'],
        datasets: [{
          label: 'Monto Acumulado',
          data: [this.dashInversion(), this.dashVentas(), this.dashUtilidad()],
          backgroundColor: ['rgba(126, 34, 206, 0.9)', 'rgba(34, 197, 94, 0.8)', 'rgba(245, 158, 11, 0.9)'],
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: any) => ` S/ ${(context.parsed.y || 0).toFixed(2)}` } } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
      }
    });
  }

  ngOnDestroy() { if (this.chart) { this.chart.destroy(); } }
}
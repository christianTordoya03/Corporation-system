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

  dashInversion = computed(() => 
    this.filteredMovements()
      .filter(m => m.type === 'ENTRY')
      .reduce((acc, m) => acc + Number(m.total_cost || 0), 0)
  );

  dashVentas = computed(() => 
    this.filteredMovements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => acc + Number(m.subtotal || m.total_cost || 0), 0)
  );

  dashFacturado = computed(() => 
    this.filteredMovements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => acc + Number(m.total_invoice || m.total_cost || 0), 0)
  );

  dashIgv = computed(() => 
    this.filteredMovements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => acc + Number(m.igv_amount || 0), 0)
  );

  dashUtilidad = computed(() => 
    this.filteredMovements()
      .filter(m => m.type === 'EXIT')
      .reduce((acc, m) => {
        const ingreso = Number(m.subtotal || m.total_cost || 0); 
        const costo = Number(m.quantity) * Number((m as any).baseCost || 0); 
        return acc + (ingreso - costo);
      }, 0)
  );

  dashFlujoNeto = computed(() => this.dashVentas() - this.dashInversion());

  constructor() {
    effect(() => {
      const inversion = this.dashInversion();
      const ventasNetas = this.dashVentas();
      const utilidad = this.dashUtilidad();
      const igv = this.dashIgv();
      const facturado = this.dashFacturado();

      if (this.chart) {
        // Actualizamos labels y datos para incluir el flujo completo
        this.chart.data.labels = ['Inversión', 'Venta Neta', 'IGV', 'Facturado', 'Utilidad'];
        this.chart.data.datasets[0].data = [inversion, ventasNetas, igv, facturado, utilidad];
        this.chart.data.datasets[0].backgroundColor = [
          'rgba(59, 130, 246, 0.9)', // Azul
          'rgba(16, 185, 129, 0.8)', // Verde
          'rgba(239, 68, 68, 0.85)', // Rojo
          'rgba(30, 41, 59, 0.9)',   // Pizarra
          'rgba(245, 158, 11, 0.9)'  // Ámbar
        ];
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

    const s_title = { font: { bold: true, size: 16, color: { rgb: "1E293B" } }, alignment: { horizontal: "center" } };
    const s_date = { font: { size: 10, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } };
    const base_box = { font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
    
    // Estilos por Bloque (Orden Solicitado)
    const s_box_inv = { ...base_box, fill: { fgColor: { rgb: "3B82F6" } } };
    const s_box_inv_t = { ...s_box_inv, font: { size: 9, bold: true, color: { rgb: "DBEAFE" } } };

    const s_box_ven = { ...base_box, fill: { fgColor: { rgb: "10B981" } } };
    const s_box_ven_t = { ...s_box_ven, font: { size: 9, bold: true, color: { rgb: "D1FAE5" } } };

    const s_box_igv = { ...base_box, fill: { fgColor: { rgb: "EF4444" } } };
    const s_box_igv_t = { ...s_box_igv, font: { size: 9, bold: true, color: { rgb: "FEE2E2" } } };

    const s_box_fac = { ...base_box, fill: { fgColor: { rgb: "1E293B" } } };
    const s_box_fac_t = { ...s_box_fac, font: { size: 9, bold: true, color: { rgb: "CBD5E1" } } };

    const s_box_flu = { ...base_box, fill: { fgColor: { rgb: "06B6D4" } } };
    const s_box_flu_t = { ...s_box_flu, font: { size: 9, bold: true, color: { rgb: "CFFAFE" } } };

    const s_box_util = { ...base_box, fill: { fgColor: { rgb: "F59E0B" } } };
    const s_box_util_t = { ...s_box_util, font: { size: 9, bold: true, color: { rgb: "FEF3C7" } } };

    const s_header = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "334155" } }, alignment: { horizontal: "center", vertical: "center" } };
    const s_cell_border = { border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };

    ws_data.push([{ v: "G.R.A. GRUPO CORPORATIVO - REPORTE GERENCIAL INTEGRAL", s: s_title }]);
    const fechaText = `Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    ws_data.push([{ v: fechaText, s: s_date }]);
    ws_data.push([]); 

    // 2. Bloques de Resumen en el ORDEN SOLICITADO (6 bloques, 12 columnas)
    ws_data.push([
      { v: "INVERSIÓN", s: s_box_inv_t }, null, 
      { v: "VENTA NETA", s: s_box_ven_t }, null,
      { v: "IGV TOTAL (SUNAT)", s: s_box_igv_t }, null,
      { v: "TOTAL FACTURADO", s: s_box_fac_t }, null,
      { v: "FLUJO NETO REAL", s: s_box_flu_t }, null,
      { v: "UTILIDAD NETA", s: s_box_util_t }, null
    ]);
    
    const fmt = (val: number) => this.currencyPipe.transform(val, 'S/ ') || 'S/ 0.00';
    ws_data.push([
      { v: fmt(this.dashInversion()), s: { ...s_box_inv, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null,
      { v: fmt(this.dashVentas()), s: { ...s_box_ven, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null,
      { v: fmt(this.dashIgv()), s: { ...s_box_igv, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null,
      { v: fmt(this.dashFacturado()), s: { ...s_box_fac, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null,
      { v: fmt(this.dashFlujoNeto()), s: { ...s_box_flu, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null,
      { v: fmt(this.dashUtilidad()), s: { ...s_box_util, font: { size: 14, bold: true, color: { rgb: "FFFFFF" } } } }, null
    ]);
    
    ws_data.push([]); ws_data.push([]);

    // 3. Desglose Analítico con el mismo orden
    ws_data.push([{ v: "DESGLOSE ANALÍTICO POR PRODUCTO", s: { font: { bold: true, size: 12, color: { rgb: "1E293B" } } } }]);
    ws_data.push([
      { v: "CÓDIGO", s: s_header },
      { v: "PRODUCTO", s: s_header },
      { v: "STOCK", s: s_header },
      { v: "INVERSIÓN", s: s_header },
      { v: "VENTA NETA", s: s_header },
      { v: "IGV", s: s_header },
      { v: "FACTURADO", s: s_header },
      { v: "UTILIDAD", s: s_header }
    ]);

    this.filteredProducts().forEach(p => {
      const pMovs = this.filteredMovements().filter(m => m.product_id === p.id);
      const pInv = pMovs.filter(m => m.type === 'ENTRY').reduce((acc, m) => acc + Number(m.total_cost || 0), 0);
      const pVen = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => acc + Number(m.subtotal || m.total_cost || 0), 0);
      const pIgv = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => acc + Number(m.igv_amount || 0), 0);
      const pFac = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => acc + Number(m.total_invoice || m.total_cost || 0), 0);
      const pUtil = pMovs.filter(m => m.type === 'EXIT').reduce((acc, m) => {
        const ingreso = Number(m.subtotal || m.total_cost || 0);
        const costo = Number(m.quantity) * Number((m as any).baseCost || 0);
        return acc + (ingreso - costo);
      }, 0);

      ws_data.push([
        { v: p.code, s: { ...s_cell_border, alignment: { horizontal: "center" } } },
        { v: p.name, s: { ...s_cell_border } },
        { v: p.current_stock, s: { ...s_cell_border, alignment: { horizontal: "center" }, font: { bold: true } } },
        { v: pInv, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } }, 
        { v: pVen, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } }, 
        { v: pIgv, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } }, 
        { v: pFac, s: { ...s_cell_border, alignment: { horizontal: "right" }, z: '"S/" #,##0.00' } }, 
        { v: pUtil, s: { ...s_cell_border, alignment: { horizontal: "right" }, font: { bold: true }, z: '"S/" #,##0.00' } }
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merges para 12 columnas (6 bloques de 2 celdas cada uno)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, 
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, 
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Inversión
      { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, // Venta Neta
      { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } }, { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } }, // IGV
      { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } }, { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } }, // Facturado
      { s: { r: 3, c: 8 }, e: { r: 3, c: 9 } }, { s: { r: 4, c: 8 }, e: { r: 4, c: 9 } }, // Flujo
      { s: { r: 3, c: 10 }, e: { r: 3, c: 11 } }, { s: { r: 4, c: 10 }, e: { r: 4, c: 11 } } // Utilidad
    ];

    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 } 
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Integral');
    XLSX.writeFile(wb, `Reporte_Ejecutivo_GRA_${new Date().getTime()}.xlsx`);
  }

  ngAfterViewInit() { 
    setTimeout(() => { this.initChart(); }, 150); 
  }

  initChart() {
    if (this.chart) { this.chart.destroy(); }
    const ctx = this.chartRef.nativeElement.getContext('2d');
    
    // Carga inicial forzada de valores actuales
    const inv = this.dashInversion();
    const ven = this.dashVentas();
    const igv = this.dashIgv();
    const fac = this.dashFacturado();
    const uti = this.dashUtilidad();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Inversión', 'Venta Neta', 'IGV', 'Facturado', 'Utilidad'],
        datasets: [{
          label: 'Monto Acumulado (S/)',
          data: [inv, ven, igv, fac, uti],
          backgroundColor: [
            'rgba(59, 130, 246, 0.9)', 
            'rgba(16, 185, 129, 0.8)', 
            'rgba(239, 68, 68, 0.85)',
            'rgba(30, 41, 59, 0.9)',
            'rgba(245, 158, 11, 0.9)'
          ], 
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
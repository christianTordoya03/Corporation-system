import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common'; 
import { KardexService } from '../../core/services/kardex.service';
import * as XLSX from 'xlsx-js-style'; 

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe, CurrencyPipe], 
  templateUrl: './history.component.html'
})
export class HistoryComponent {
  kardex = inject(KardexService);
  datePipe = inject(DatePipe);
  currencyPipe = inject(CurrencyPipe);

  filterType = signal<'ALL' | 'ENTRY' | 'EXIT'>('ALL');

  filteredMovements = computed(() => {
    const type = this.filterType();
    const movs = this.kardex.sortedMovements();
    if (type === 'ALL') return movs;
    return movs.filter(m => m.type === type);
  });

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterType.set(select.value as 'ALL' | 'ENTRY' | 'EXIT');
  }

  getCustomerName(id?: string | null): string {
    if (!id) return '-';
    const c = this.kardex.customers().find(cust => cust.id === id);
    return c ? c.name : '-';
  }

  exportToExcel() {
    if (this.filteredMovements().length === 0) {
      alert('No hay movimientos para exportar.');
      return;
    }

    const type = this.filterType();
    const ws_data: any[] = [];
    const fDate = (d: any) => d ? this.datePipe.transform(d, 'dd/MM/yyyy') : '-';
    const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    const s_title = { font: { bold: true, size: 16, color: { rgb: "0F172A" } }, alignment: { horizontal: "center", vertical: "center" } };
    const s_subtitle = { font: { size: 10, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } };
    
    const s_cat_base = { font: { bold: true, color: { rgb: "FFFFFF" }, size: 10 }, fill: { fgColor: { rgb: "4338CA" } }, alignment: { horizontal: "center", vertical: "center" } }; 
    const s_cat_doc = { font: { bold: true, color: { rgb: "FFFFFF" }, size: 10 }, fill: { fgColor: { rgb: "334155" } }, alignment: { horizontal: "center", vertical: "center" } }; 
    const s_cat_fin = { font: { bold: true, color: { rgb: "FFFFFF" }, size: 10 }, fill: { fgColor: { rgb: "059669" } }, alignment: { horizontal: "center", vertical: "center" } }; 
    const s_cat_log = { font: { bold: true, color: { rgb: "FFFFFF" }, size: 10 }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } }; 

    const s_header = { 
      font: { bold: true, color: { rgb: "334155" }, size: 9 }, 
      fill: { fgColor: { rgb: "F1F5F9" } }, 
      border: { bottom: { style: "medium", color: { rgb: "CBD5E1" } }, top: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, 
      alignment: { horizontal: "center", vertical: "center", wrapText: true } 
    };

    const s_cell_center = { border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center", vertical: "center" }, font: { size: 10 } };
    const s_cell_left = { border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "left", vertical: "center", wrapText: true }, font: { size: 10 } };
    const s_num = { border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "right", vertical: "center" }, font: { size: 10 }, z: '"S/" #,##0.00' };

    const tituloReporte = type === 'ENTRY' ? "G.R.A. - REPORTE DE INGRESOS (ENTRADAS)" : "G.R.A. - AUDITORÍA LOGÍSTICA Y FINANCIERA";
    ws_data.push([{ v: tituloReporte, s: s_title }]);
    ws_data.push([{ v: `Generado el: ${new Date().toLocaleString()} | Filtro: ${type === 'ALL' ? 'MIXTO' : (type === 'ENTRY' ? 'ENTRADAS' : 'SALIDAS')}`, s: s_subtitle }]);
    ws_data.push([]); 

    if (type === 'ENTRY') {
      ws_data.push([
        { v: "FECHA", s: s_header }, { v: "SKU", s: s_header }, { v: "PRODUCTO / DESCRIPCIÓN", s: s_header },
        { v: "REFERENCIA", s: s_header }, { v: "CANT.", s: s_header }, { v: "COSTO UNIT.", s: s_header },
        { v: "TOTAL INVERSIÓN", s: s_header }, { v: "OPERADOR", s: s_header }
      ]);

      this.filteredMovements().forEach(mov => {
        ws_data.push([
          { v: fDate(mov.date), s: s_cell_center },
          { v: mov.productCode, s: { ...s_cell_center, font: { name: "Courier New" } } },
          { v: this.kardex.products().find(p => p.id === mov.product_id)?.name || '-', s: s_cell_left },
          { v: mov.reference, s: s_cell_center },
          { v: mov.quantity, s: { ...s_cell_center, font: { bold: true } } },
          { v: round2(mov.unit_cost), s: s_num },
          { v: round2(mov.total_cost || 0), s: { ...s_num, font: { bold: true } } },
          { v: mov.operator, s: s_cell_left }
        ]);
      });
    } else {
      ws_data.push([
        { v: "📦 DATOS BÁSICOS", s: s_cat_base }, null, null, null, null,
        { v: "📄 DOCUMENTACIÓN", s: s_cat_doc }, null, null, null, null, null,
        { v: "💰 FINANZAS Y TRIBUTOS", s: s_cat_fin }, null, null, null, null, null,
        { v: "🚚 LOGÍSTICA DE DESPACHO", s: s_cat_log }, null, null, null
      ]);

      ws_data.push([
        { v: "TIPO", s: s_header }, { v: "N° O.C.", s: s_header }, { v: "FECHA ORD.COMP.", s: s_header }, { v: "PRODUCTO / DESCRIPCION.", s: s_header }, { v: "CANTIDAD", s: s_header },
        { v: "N° GUIA REM.", s: s_header }, { v: "FECHA GUIA R.", s: s_header }, { v: "ENTREGA", s: s_header }, { v: "PROCESO", s: s_header }, { v: "FACTURA", s: s_header }, { v: "FECHA FACT.", s: s_header },
        { v: "TOTAL FACT.", s: s_header }, { v: "IGV", s: s_header }, { v: "TOTAL VENTA", s: s_header }, { v: "DETRAC. %", s: s_header }, { v: "MONTO DETRAC.", s: s_header }, { v: "RETENCION 3%", s: s_header },
        { v: "CLIENTE / EMPRESA", s: s_header }, { v: "PLACA CAMIÓN", s: s_header }, { v: "CONDUCTOR", s: s_header }, { v: "OPERADOR", s: s_header }
      ]);

      this.filteredMovements().forEach(mov => {
        const isEntry = mov.type === 'ENTRY';
        ws_data.push([
          { v: isEntry ? 'ENTRADA' : 'SALIDA', s: { ...s_cell_center, font: { bold: true, color: { rgb: isEntry ? "059669" : "DC2626" } } } },
          { v: mov.reference || '-', s: s_cell_center },
          { v: fDate(mov.oc_date), s: s_cell_center },
          { v: `${mov.productCode} - ${this.kardex.products().find(p => p.id === mov.product_id)?.name || ''}`, s: s_cell_left },
          { v: isEntry ? mov.quantity : -mov.quantity, s: { ...s_cell_center, font: { bold: true } } },
          { v: mov.remission_guide || '-', s: s_cell_center },
          { v: fDate(mov.remission_date), s: s_cell_center },
          { v: fDate(mov.delivery_date), s: s_cell_center },
          
          // MAPEO DEL CAMPO PROCESO REAL
          { v: mov.proceso || '-', s: s_cell_center }, 
          
          { v: mov.invoice_number || '-', s: s_cell_center },
          { v: fDate(mov.invoice_date), s: s_cell_center },
          { v: round2(mov.total_invoice || mov.total_cost || 0), s: { ...s_num, font: { bold: true } } },
          { v: round2(mov.igv_amount || 0), s: s_num },
          { v: round2(mov.subtotal || mov.total_cost || 0), s: s_num },
          { v: (mov.detraction_pct || 0) + '%', s: s_cell_center },
          { v: round2(mov.detraction_amount || 0), s: s_num },
          { v: round2(mov.retention_amount || 0), s: s_num },
          { v: this.getCustomerName(mov.customer_id), s: s_cell_left },
          { v: mov.truck_plate || '-', s: s_cell_center },
          { v: mov.driver_name || '-', s: s_cell_left },
          { v: mov.operator || 'Desconocido', s: s_cell_left }
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();

    const tipoArchivo = type === 'ENTRY' ? 'ENTRADAS' : (type === 'EXIT' ? 'SALIDAS' : 'MIXTO');
    const fechaArchivo = this.datePipe.transform(new Date(), 'dd-MM-yyyy_HHmm');

    ws['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 10 }, { hpt: 25 }, { hpt: 35 }];

    if (type === 'ENTRY') {
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
      ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 25 }];
    } else {
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } }, 
        { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, { s: { r: 3, c: 5 }, e: { r: 3, c: 10 } }, 
        { s: { r: 3, c: 11 }, e: { r: 3, c: 16 } }, { s: { r: 3, c: 17 }, e: { r: 3, c: 20 } }
      ];
      ws['!cols'] = Array(21).fill({ wch: 16 });
      ws['!cols'][3] = { wch: 40 }; 
      ws['!cols'][17] = { wch: 35 }; 
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Historial G.R.A.');
    XLSX.writeFile(wb, `Reporte_G.R.A_${tipoArchivo}_${fechaArchivo}.xlsx`);
  }
}
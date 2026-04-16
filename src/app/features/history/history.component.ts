import { Component, inject } from '@angular/core';
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

  exportToExcel() {
    if (this.kardex.sortedMovements().length === 0) {
      alert('No hay movimientos para exportar.');
      return;
    }

    const ws_data: any[] = [];

    // --- 1. DEFINICIÓN DE ESTILOS GERENCIALES ---
    // Título y Fecha
    const s_title = { font: { bold: true, size: 16, color: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } };
    const s_date = { font: { size: 10, color: { rgb: "64748B" }, italic: true }, alignment: { horizontal: "center", vertical: "center" } };

    // Encabezado de la tabla (Fondo oscuro, letra blanca)
    const s_header = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E293B" } }, // Azul oscuro casi negro (Slate 800)
      border: { bottom: { style: "medium", color: { rgb: "000000" } } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Estilos de celdas normales
    const s_data_left = { alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const s_data_center = { alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const s_data_right = { alignment: { horizontal: "right", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }, z: '"S/" #,##0.00' };

    // Estilos dinámicos para Entradas (Verde) y Salidas (Rojo)
    const s_entry = { font: { bold: true, color: { rgb: "16A34A" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const s_exit = { font: { bold: true, color: { rgb: "DC2626" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    
    const s_qty_entry = { font: { bold: true, color: { rgb: "16A34A" } }, alignment: { horizontal: "right", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const s_qty_exit = { font: { bold: true, color: { rgb: "DC2626" } }, alignment: { horizontal: "right", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };

    // --- 2. CONSTRUCCIÓN DEL REPORTE ---
    // Título
    ws_data.push([{ v: "REPORTE DETALLADO DE MOVIMIENTOS", s: s_title }]);
    
    // Fecha de generación
    const fechaText = `Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
    ws_data.push([{ v: fechaText, s: s_date }]);
    ws_data.push([]); // Fila vacía para respirar

    // Fila de Encabezados (AHORA INCLUYE OPERADOR)
    ws_data.push([
      { v: "FECHA Y HORA", s: s_header },
      { v: "DOCUMENTO / REF", s: s_header },
      { v: "CÓDIGO PRODUCTO", s: s_header },
      { v: "TIPO", s: s_header },
      { v: "OPERADOR", s: s_header }, // <-- COLUMNA AÑADIDA
      { v: "CANTIDAD", s: s_header },
      { v: "COSTO UNIT.", s: s_header },
      { v: "TOTAL", s: s_header }
    ]);

    // --- 3. LLENADO DE DATOS DINÁMICOS ---
    this.kardex.sortedMovements().forEach(mov => {
      const isEntry = mov.type === 'ENTRY';
      const qty = isEntry ? mov.quantity : -mov.quantity;

      ws_data.push([
        { v: this.datePipe.transform(mov.date, 'dd/MM/yyyy HH:mm'), s: s_data_center },
        { v: mov.reference, s: s_data_center },
        { v: mov.productCode, s: s_data_center },
        { v: isEntry ? 'ENTRADA' : 'SALIDA', s: isEntry ? s_entry : s_exit },
        { v: mov.operator || 'Desconocido', s: s_data_center }, // <-- DATO AÑADIDO
        { v: qty, s: isEntry ? s_qty_entry : s_qty_exit }, 
        { v: Number(mov.unit_cost), s: s_data_right }, 
        { v: Number(mov.total_cost), s: s_data_right }
      ]);
    });

    // --- 4. CONFIGURACIÓN FINAL DEL EXCEL ---
    const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
    const workbook = XLSX.utils.book_new();

    // Combinar celdas para el título y la fecha (Ahora hasta la columna 7 o 'H')
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Combina A1:H1 para el título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }  // Combina A2:H2 para la fecha
    ];

    // Ajuste de ancho de columnas (Ahora son 8 columnas)
    worksheet['!cols'] = [
      { wch: 18 }, // Fecha
      { wch: 20 }, // Ref
      { wch: 22 }, // Codigo
      { wch: 15 }, // Tipo
      { wch: 20 }, // Operador
      { wch: 12 }, // Cantidad
      { wch: 18 }, // Unitario
      { wch: 18 }  // Total
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial Detallado');

    const fechaArchivo = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmm');
    XLSX.writeFile(workbook, `Historial_Movimientos_${fechaArchivo}.xlsx`);
  }
}
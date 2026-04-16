import { Component, input, output, inject } from '@angular/core';
import { KardexService } from '../../../core/services/kardex.service'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports:[CommonModule],
  template: `
    <header class="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
          G.R.A. <span class="text-purple-700">Corporativo</span>
        </h1>
        <p class="text-slate-500 font-medium text-sm">Control de Stock y Operaciones Logísticas</p>
      </div>
      
      <div class="flex flex-col items-end gap-4">
        
        <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <div class="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
            {{ kardex.currentUser()?.name?.charAt(0) | uppercase }}
          </div>
          <div class="flex flex-col leading-none">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Operador</span>
            <span class="text-sm font-bold text-slate-800">{{ kardex.currentUser()?.name }}</span>
          </div>
          <div class="h-6 w-px bg-slate-200 mx-1"></div>
          <button (click)="kardex.logout()" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar Sesión">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <div class="flex gap-2 bg-slate-100 p-1 rounded-xl">
          @for (tab of tabs; track tab.id) {
            <button (click)="viewChanged.emit(tab.id)" 
              [class]="currentView() === tab.id ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20' : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'"
              class="px-5 py-2 rounded-lg font-bold text-sm transition-all">
              {{ tab.label }}
            </button>
          }
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  kardex = inject(KardexService);
  currentView = input.required<string>();
  viewChanged = output<string>();

  tabs = [
    { id: 'dashboard', label: 'Estadísticas' },
    { id: 'inventory', label: 'Inventario Físico' },
    { id: 'history', label: 'Auditoría de Movimientos' }
  ];
}
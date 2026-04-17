import { Component, input, output, inject } from '@angular/core';
import { KardexService } from '../../../core/services/kardex.service'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports:[CommonModule],
  template: `
    <header class="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 mb-6">
      <div class="max-w-[1850px] mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <h1 class="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">
              G.R.A. <span class="text-indigo-600">Corporativo</span>
            </h1>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management System v2.0</span>
          </div>
        </div>

        <nav class="hidden lg:flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
          @for (tab of tabs; track tab.id) {
            <button (click)="viewChanged.emit(tab.id)" 
              [class]="currentView() === tab.id ? 'bg-white text-slate-900 shadow-sm border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-800'"
              class="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-transparent">
              {{ tab.label }}
            </button>
          }
        </nav>

        <div class="flex items-center gap-4">
          <div class="flex flex-col items-end mr-2">
            <span class="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Acceso Autorizado</span>
            <span class="text-sm font-black text-slate-700">{{ kardex.currentUser()?.name }}</span>
          </div>
          <div class="relative group">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-base shadow-xl group-hover:rotate-6 transition-transform">
              {{ kardex.currentUser()?.name?.charAt(0) | uppercase }}
            </div>
            <button (click)="kardex.logout()" 
              class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full border-2 border-white flex items-center justify-center hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
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
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'history', label: 'Movimientos' }
  ];
}
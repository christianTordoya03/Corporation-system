import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// 1. Importaciones de Componentes de Arquitectura y UI
import { HeaderComponent } from './shared/components/header/header.component';
import { MovementModalComponent } from './features/movement-modal/movement-modal.component';
import { LoginComponent } from './features/auth/login.component';

// 2. Importaciones de Vistas del Negocio
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { HistoryComponent } from './features/history/history.component';

// 3. Importación del Servicio Central
import { KardexService } from './core/services/kardex.service';
import { OrdersComponent } from './features/orders/orders.component';

// --- DEFINICIÓN DEL ESTADO DE VISTA ---
type ViewState = 'dashboard' | 'inventory' | 'history' | 'orders';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    DashboardComponent,
    InventoryComponent,
    HistoryComponent,
    OrdersComponent,
    MovementModalComponent,
    LoginComponent
  ],
  template: `
    @if (!kardex.currentUser()) {
      <app-login></app-login>
    } 
    @else {
      <div class="min-h-screen bg-slate-50 font-sans">
        <app-header 
          [currentView]="view()" 
          (viewChanged)="changeView($event)">
        </app-header>

        <main class="max-w-[1850px] mx-auto px-4 md:px-6">
          @switch (view()) {
            @case ('dashboard') { <app-dashboard /> }
            @case ('inventory') { <app-inventory /> }
            @case ('history') { <app-history /> }
            @case ('orders') { <app-orders /> }
          }
        </main>

        @if (kardex.activeProduct()) {
          <app-movement-modal />
        }
      </div>
    }
  `
})
export class AppComponent {
  view = signal<ViewState>('dashboard');
  kardex = inject(KardexService);

  changeView(newView: string) {
    this.view.set(newView as ViewState);
  }
}
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/components/header/header.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { HistoryComponent } from './features/history/history.component';
import { MovementModalComponent } from './features/movement-modal/movement-modal.component';
import { LoginComponent } from './features/auth/login.component'; // <-- Importamos el Login
import { KardexService } from './core/services/kardex.service';

type ViewState = 'dashboard' | 'inventory' | 'history';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    DashboardComponent,
    InventoryComponent,
    HistoryComponent,
    MovementModalComponent,
    LoginComponent // <-- Lo añadimos a los imports
  ],
  template: `
    @if (!kardex.currentUser()) {
      <app-login></app-login>
    } 
    @else {
      <div class="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
        <app-header 
          [currentView]="view()" 
          (viewChanged)="changeView($event)">
        </app-header>

        <main class="max-w-7xl mx-auto">
          @switch (view()) {
            @case ('dashboard') { <app-dashboard /> }
            @case ('inventory') { <app-inventory /> }
            @case ('history') { <app-history /> }
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
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { KardexService } from '../../core/services/kardex.service';
import { Customer, PurchaseOrder, Product } from '../../core/models/kardex.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe],
  templateUrl: './orders.component.html'
})
export class OrdersComponent {
  kardex = inject(KardexService);
  selectedCustomer = signal<Customer | null>(null);

  customerOrders = computed(() => {
    const cust = this.selectedCustomer();
    if (!cust) return [];
    return this.kardex.purchaseOrders().filter(oc => oc.customer_id === cust.id);
  });

  registrarDespachoDiario(oc: PurchaseOrder) {
    const product = this.kardex.products().find(p => p.id === oc.product_id);
    if (product) {
      // Pasamos el producto, el tipo 'EXIT' y la 'OC' completa
      this.kardex.openMovement(product, 'EXIT', oc);
    } else {
      alert('Error: No se encontró la información del producto vinculado a esta O.C.');
    }
  }
}
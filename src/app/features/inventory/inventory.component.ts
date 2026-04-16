import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { KardexService } from '../../core/services/kardex.service';
import { Product } from '../../core/models/kardex.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent {
  public kardex = inject(KardexService);
  private fb = inject(FormBuilder);

  searchQuery = signal('');
  showForm = signal(false);
  
  // Señales para edición y eliminación
  editingProductId = signal<string | null>(null);
  productToDelete = signal<Product | null>(null); // <-- Nueva señal para el modal

  productForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    category: ['Madera'],
    min_stock: [5, [Validators.required, Validators.min(0)]],
    unit_price: [0, [Validators.required, Validators.min(0)]]
  });

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.kardex.products().filter(p => 
      p.code.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q)
    );
  });

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  openNewProductForm() {
    this.editingProductId.set(null);
    this.productForm.reset({ category: 'Madera', min_stock: 5, unit_price: 0 });
    this.showForm.set(true);
  }

  editProduct(product: Product) {
    this.editingProductId.set(product.id);
    this.productForm.patchValue({
      code: product.code,
      name: product.name,
      category: product.category,
      min_stock: product.min_stock,
      unit_price: product.unit_price
    });
    this.showForm.set(true);
  }

  // ---- NUEVA LÓGICA DE ELIMINACIÓN CON MODAL ----
  confirmDelete(product: Product) {
    this.productToDelete.set(product);
  }

  cancelDelete() {
    this.productToDelete.set(null);
  }

  executeDelete() {
    const product = this.productToDelete();
    if (product) {
      this.kardex.deleteProduct(product.id);
      this.productToDelete.set(null); // Cierra el modal
    }
  }
  // -----------------------------------------------

  saveProduct() {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const productData = {
        code: formValue.code,
        name: formValue.name,
        category: formValue.category,
        min_stock: formValue.min_stock,
        unit_price: formValue.unit_price
      };

      const id = this.editingProductId();
      if (id) {
        this.kardex.updateProduct(id, productData as any);
      } else {
        this.kardex.addProduct(productData as any);
      }
      
      this.productForm.reset({ category: 'Madera', min_stock: 5, unit_price: 0 });
      this.showForm.set(false);
      this.editingProductId.set(null);
    }
  }

  triggerMovement(product: Product, type: 'ENTRY' | 'EXIT') {
    this.kardex.openMovement(product, type);
  }
}
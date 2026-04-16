import { Component, inject, effect, signal } from '@angular/core'; // <-- Añade signal aquí
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { KardexService } from '../../core/services/kardex.service';

@Component({
  selector: 'app-movement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './movement-modal.component.html' 
})
export class MovementModalComponent {
  public kardex = inject(KardexService);
  private fb = inject(FormBuilder);

  // NUEVO: Controla si mostramos el select o el formulario de nuevo cliente
  isNewCustomer = signal(false);

  movementForm = this.fb.group({
    reference: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    customer_id: [''],
    truck_plate: [''],
    driver_name: [''],
    // Nuevos campos para registrar cliente al vuelo
    newCustomerName: [''],
    newCustomerAddress: ['']
  });

  constructor() {
    effect(() => {
      const product = this.kardex.activeProduct();
      const type = this.kardex.movementType();
      
      if (product) {
        this.movementForm.patchValue({
          unitCost: product.unit_price,
          quantity: 1,
          reference: type === 'ENTRY' ? 'OC-' : 'FAC-',
          customer_id: '',
          truck_plate: '',
          driver_name: '',
          newCustomerName: '',
          newCustomerAddress: ''
        });
        this.isNewCustomer.set(false); // Resetea el toggle
      }
    });
  }

  // Alternar entre seleccionar cliente o crear uno nuevo
  toggleCustomerMode() {
    this.isNewCustomer.set(!this.isNewCustomer());
    this.movementForm.patchValue({ customer_id: '', newCustomerName: '', newCustomerAddress: '' });
  }

  // NUEVO: Se vuelve async para poder esperar la creación del cliente
  async submitMovement() {
    if (this.movementForm.valid) {
      const formVals = this.movementForm.value;
      let finalCustomerId = formVals.customer_id;

      // Si el operador decidió crear un cliente nuevo
      if (this.kardex.movementType() === 'EXIT' && this.isNewCustomer()) {
        if (!formVals.newCustomerName?.trim()) {
          alert('El nombre de la empresa es obligatorio.');
          return;
        }
        // Creamos el cliente en la BD y obtenemos su ID
        const newId = await this.kardex.addCustomer(formVals.newCustomerName, formVals.newCustomerAddress || undefined);
        if (!newId) return; // Si falló, detenemos el proceso
        finalCustomerId = newId;
      }

      // Agrupamos los datos de despacho
      const logisticData = this.kardex.movementType() === 'EXIT' 
        ? { 
            customer_id: finalCustomerId || undefined, 
            truck_plate: formVals.truck_plate || undefined, 
            driver_name: formVals.driver_name || undefined 
          } 
        : undefined;

      this.kardex.processMovement(formVals.reference!, formVals.quantity!, formVals.unitCost!, logisticData);
      this.movementForm.reset();
      this.isNewCustomer.set(false);
    }
  }
}
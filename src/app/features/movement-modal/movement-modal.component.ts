import { Component, inject, effect, signal } from '@angular/core';
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

  isNewCustomer = signal(false);

  // Cálculos dinámicos para el resumen visual
  calcSubtotal = 0;
  calcIgv = 0;
  calcTotalFactura = 0;
  calcRetencion = 0;
  calcDetraccion = 0;

  movementForm = this.fb.group({
    reference: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    
    customer_id: [''],
    truck_plate: [''],
    driver_name: [''],
    newCustomerName: [''],
    newCustomerAddress: [''],

    oc_date: [''],
    remission_guide: [''],
    remission_date: [''],
    delivery_date: [''],
    proceso: [''], 
    invoice_number: [''],
    invoice_date: [''],

    apply_retention: [false], 
    detraction_pct: [0]       
  });

  constructor() {
    // SINCRONIZACIÓN CON ÓRDENES DE COMPRA (OC)
    effect(() => {
      const product = this.kardex.activeProduct();
      const type = this.kardex.movementType();
      const activeOC = this.kardex.activePurchaseOrder(); // Detectamos si hay una OC vinculada
      
      if (product) {
        // Habilitamos los campos por defecto antes del reset
        this.movementForm.get('customer_id')?.enable();
        this.movementForm.get('reference')?.enable();

        this.movementForm.reset({
          unitCost: product.unit_price,
          quantity: 1,
          reference: activeOC ? activeOC.oc_number : (type === 'ENTRY' ? 'FABRICADO' : ''),
          customer_id: activeOC ? activeOC.customer_id : '',
          proceso: '',
          apply_retention: false,
          detraction_pct: 0
        });

        // Bloqueamos los campos si el despacho es por una OC específica
        if (activeOC) {
          this.movementForm.get('customer_id')?.disable();
          this.movementForm.get('reference')?.disable();
        }
        
        this.isNewCustomer.set(false); 
      }
    });

    this.movementForm.valueChanges.subscribe(vals => {
      this.calcSubtotal = (vals.quantity || 0) * (vals.unitCost || 0);
      this.calcIgv = this.calcSubtotal * 0.18; 
      this.calcTotalFactura = this.calcSubtotal + this.calcIgv;
      this.calcRetencion = vals.apply_retention ? (this.calcTotalFactura * 0.03) : 0; 
      this.calcDetraccion = this.calcTotalFactura * ((vals.detraction_pct || 0) / 100);
    });
  }

  toggleCustomerMode() {
    this.isNewCustomer.set(!this.isNewCustomer());
    this.movementForm.patchValue({ customer_id: '', newCustomerName: '', newCustomerAddress: '' });
  }

  async submitMovement() {
    if (this.movementForm.valid || this.movementForm.disabled) { // Consideramos el estado disabled por la OC
      const formVals = this.movementForm.getRawValue(); // getRawValue para obtener campos disabled
      let finalCustomerId = formVals.customer_id;

      if (this.kardex.movementType() === 'EXIT' && this.isNewCustomer()) {
        if (!formVals.newCustomerName?.trim()) {
          alert('El nombre de la empresa es obligatorio.');
          return;
        }
        const newId = await this.kardex.addCustomer(formVals.newCustomerName, formVals.newCustomerAddress || undefined);
        if (!newId) return; 
        finalCustomerId = newId;
      }

      const logisticData = this.kardex.movementType() === 'EXIT' 
        ? { 
            customer_id: finalCustomerId || undefined, 
            truck_plate: formVals.truck_plate || undefined, 
            driver_name: formVals.driver_name || undefined,
            oc_date: formVals.oc_date || undefined,
            remission_guide: formVals.remission_guide || undefined,
            remission_date: formVals.remission_date || undefined,
            delivery_date: formVals.delivery_date || undefined,
            proceso: formVals.proceso || undefined,
            invoice_number: formVals.invoice_number || undefined,
            invoice_date: formVals.invoice_date || undefined
          } 
        : undefined;

      const financialData = this.kardex.movementType() === 'EXIT' 
        ? {
            subtotal: this.calcSubtotal,
            igv: this.calcIgv,
            totalFactura: this.calcTotalFactura,
            retencion: this.calcRetencion,
            detraction_pct: formVals.detraction_pct || 0,
            detraccion: this.calcDetraccion
          } 
        : undefined;

      this.kardex.processMovement(
        formVals.reference!, 
        formVals.quantity!, 
        formVals.unitCost!, 
        logisticData, 
        financialData
      );
    }
  }
}
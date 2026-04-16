import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KardexService } from '../../core/services/kardex.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html' // <-- Enlazado al archivo HTML
})
export class LoginComponent {
  kardex = inject(KardexService);
  name = '';
  dni = '';
  currentYear = new Date().getFullYear();

  onSubmit() {
    if (this.name.trim() && this.dni.trim()) {
      this.kardex.login({ name: this.name.trim(), dni: this.dni.trim() });
    } else {
      alert('Por favor, ingresa tu Nombre y DNI.');
    }
  }
}
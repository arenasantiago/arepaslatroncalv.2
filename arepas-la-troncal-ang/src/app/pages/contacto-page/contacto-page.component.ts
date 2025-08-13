import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { WhatsappFabComponent } from "../../shared/whatsapp-fab/whatsapp-fab.component";

@Component({
  selector: 'app-contacto-page',
  imports: [CommonModule, NavbarComponent, FooterComponent, WhatsappFabComponent, FormsModule],
  templateUrl: './contacto-page.component.html',
})
export class ContactoPageComponent {
  sending = false;
  success = false;
  error = false;

  private encode(data: Record<string, string>) {
    return Object.keys(data)
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(data[k] ?? ''))
      .join('&');
  }

  onSubmit(form: NgForm) {
    if (form.invalid) return;
    this.sending = true;
    this.success = false;
    this.error = false;

    const payload = {
      'form-name': 'contacto-arepas',
      ...form.value,
    } as Record<string, string>;

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: this.encode(payload),
    })
      .then(() => {
        this.success = true;
        form.resetForm();
      })
      .catch(() => {
        this.error = true;
      })
      .finally(() => (this.sending = false));
    }
}

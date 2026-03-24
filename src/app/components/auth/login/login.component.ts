import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

type AuthMode = 'login' | 'register' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode = signal<AuthMode>('login');
  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  setMode(m: AuthMode) {
    this.mode.set(m);
    this.error.set(null);
    this.successMessage.set(null);
    this.password.set('');
  }

  async onSubmit() {
    this.error.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    try {
      if (this.mode() === 'login') {
        const { error } = await this.auth.signIn(this.email(), this.password());
        if (error) { this.error.set(error.message); return; }
        this.router.navigate(['/dashboard']);

      } else if (this.mode() === 'register') {
        const { error } = await this.auth.signUp(this.email(), this.password());
        if (error) { this.error.set(error.message); return; }
        this.successMessage.set('ACCOUNT_CREATED — Check email to confirm before logging in.');

      } else if (this.mode() === 'reset') {
        const { error } = await this.auth.resetPassword(this.email());
        if (error) { this.error.set(error.message); return; }
        this.successMessage.set('RESET_LINK_SENT — Check your email.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-app-bar.component.html',
})
export class TopAppBarComponent implements OnDestroy {
  clock = signal('');
  private auth = inject(AuthService);
  userEmail = this.auth.userEmail;
  isAuthenticated = this.auth.isAuthenticated;
  private interval: ReturnType<typeof setInterval>;

  constructor() {
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() { clearInterval(this.interval); }

  signOut() { this.auth.signOut(); }

  private tick() {
    const n = new Date();
    const pad = (v: number) => v.toString().padStart(2, '0');
    this.clock.set(`[ ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())} ]`);
  }
}

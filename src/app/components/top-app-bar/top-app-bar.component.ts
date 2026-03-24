import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-app-bar.component.html',
})
export class TopAppBarComponent implements OnDestroy {
  clock = signal('');
  private interval: ReturnType<typeof setInterval>;

  constructor() {
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy() { clearInterval(this.interval); }

  private tick() {
    const n = new Date();
    const pad = (v: number) => v.toString().padStart(2, '0');
    this.clock.set(`[ ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())} ]`);
  }
}

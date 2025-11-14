import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../shared';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  imports: [
    CommonModule,
    SvgIconComponent
  ],
  templateUrl: './rest-timer.component.html',
  styleUrls: ['./rest-timer.component.scss']
})
export class RestTimerComponent implements OnInit, OnDestroy {
  @Input() restDuration = 60; // seconds
  @Input() autoStart = true;
  @Output() timerComplete = new EventEmitter<void>();
  @Output() timerDismissed = new EventEmitter<void>();

  timeRemaining = signal(0);
  isRunning = signal(false);
  progressValue = signal(100);

  private intervalId: any;

  ngOnInit() {
    this.timeRemaining.set(this.restDuration);
    if (this.autoStart) {
      this.start();
    }
  }

  ngOnDestroy() {
    this.stop();
  }

  start() {
    if (this.isRunning()) return;

    this.isRunning.set(true);
    this.intervalId = setInterval(() => {
      const remaining = this.timeRemaining() - 1;

      if (remaining <= 0) {
        this.complete();
      } else {
        this.timeRemaining.set(remaining);
        this.progressValue.set((remaining / this.restDuration) * 100);
      }
    }, 1000);
  }

  pause() {
    this.isRunning.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop() {
    this.pause();
    this.timeRemaining.set(this.restDuration);
    this.progressValue.set(100);
  }

  complete() {
    this.pause();
    this.timeRemaining.set(0);
    this.progressValue.set(0);
    this.timerComplete.emit();
  }

  dismiss() {
    this.stop();
    this.timerDismissed.emit();
  }

  addTime(seconds: number) {
    const newTime = this.timeRemaining() + seconds;
    this.timeRemaining.set(Math.max(0, newTime));
    this.progressValue.set((this.timeRemaining() / this.restDuration) * 100);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0
      ? `${mins}m${secs.toString().padStart(2, '0')}s`
      : `${secs}s`;
  }
}

import {
  Component, input, Output, EventEmitter, OnDestroy,
  signal, computed, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';

type AnimState = 'idle' | 'showing-log' | 'showing-box' | 'showing-cursor' | 'counting-down' | 'dismissed';

@Component({
  selector: 'app-workout-complete-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workout-complete-overlay.component.html',
})
export class WorkoutCompleteOverlayComponent implements OnDestroy {
  readonly elapsedSeconds = input(0);
  readonly sets = input(0);
  readonly visible = input(false);
  @Output() dismissed = new EventEmitter<void>();

  animState = signal<AnimState>('idle');
  logText = signal('');
  cursorVisible = signal(false);
  countdownWidth = signal(100);

  private timers: ReturnType<typeof setTimeout>[] = [];
  private typewriterInterval?: ReturnType<typeof setInterval>;
  private cursorInterval?: ReturnType<typeof setInterval>;
  private drainInterval?: ReturnType<typeof setInterval>;

  readonly LOG_FULL = '> committing session... done';
  private readonly DISMISS_DELAY = 3000;

  formattedTime = computed(() => {
    const s = this.elapsedSeconds();
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.startSequence();
      } else if (this.animState() !== 'idle') {
        this.reset();
      }
    });
  }

  ngOnDestroy() {
    this.clearAll();
  }

  onOverlayClick() {
    this.dismiss();
  }

  private startSequence() {
    this.animState.set('showing-log');

    // Typewriter for boot line
    const full = this.LOG_FULL;
    let i = 0;
    this.typewriterInterval = setInterval(() => {
      this.logText.set(full.slice(0, ++i));
      if (i >= full.length) {
        clearInterval(this.typewriterInterval!);
        this.typewriterInterval = undefined;
      }
    }, 30);

    // Show box at 600ms
    this.timers.push(setTimeout(() => this.animState.set('showing-box'), 600));

    // Show cursor at 900ms + start blink
    this.timers.push(setTimeout(() => {
      this.animState.set('showing-cursor');
      this.cursorVisible.set(true);
      this.cursorInterval = setInterval(() => {
        this.cursorVisible.update(v => !v);
      }, 500);

      // Start countdown drain: from 100 → 0 over DISMISS_DELAY
      const start = Date.now();
      const drain = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 100 - (elapsed / this.DISMISS_DELAY) * 100);
        this.countdownWidth.set(pct);
        if (pct <= 0) clearInterval(drain);
      }, 16);
      this.drainInterval = drain;

      // Defer counting-down by 1 frame so showing-cursor is observable
      this.timers.push(setTimeout(() => this.animState.set('counting-down'), 50));
    }, 900));

    // Auto-dismiss at 900 + DISMISS_DELAY
    this.timers.push(setTimeout(() => this.dismiss(), 900 + this.DISMISS_DELAY));
  }

  private dismiss() {
    if (this.animState() === 'dismissed') return;
    this.animState.set('dismissed');
    this.clearAll();
    this.dismissed.emit();
  }

  private reset() {
    this.clearAll();
    this.animState.set('idle');
    this.logText.set('');
    this.cursorVisible.set(false);
    this.countdownWidth.set(100);
  }

  private clearAll() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = undefined;
    }
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
      this.cursorInterval = undefined;
    }
    if (this.drainInterval) {
      clearInterval(this.drainInterval);
      this.drainInterval = undefined;
    }
  }
}

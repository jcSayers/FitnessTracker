import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-custom-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast" [ngClass]="['toast-' + (config?.type || 'info')]">
      <div class="toast-content">
        <span class="toast-icon">
          <ng-container [ngSwitch]="config?.type">
            <span *ngSwitchCase="'success'">✓</span>
            <span *ngSwitchCase="'error'">✕</span>
            <span *ngSwitchCase="'warning'">⚠</span>
            <span *ngSwitchDefault>ℹ</span>
          </ng-container>
        </span>
        <span class="toast-message">{{ config?.message }}</span>
      </div>
      <button
        *ngIf="config?.action"
        class="toast-action"
        (click)="onAction()"
      >
        {{ config?.action?.label }}
      </button>
      <button class="toast-close" (click)="onClose()">
        ✕
      </button>
    </div>
  `,
  styles: [`
    .toast {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
      background: rgba(40, 40, 50, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(100, 100, 120, 0.4);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      min-width: 300px;
      max-width: 500px;
      animation: slideIn 0.3s ease forwards;
    }

    .toast.closing {
      animation: slideOut 0.3s ease forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .toast-success {
      border-left: 4px solid var(--success-color, #11d16c);
      background: rgba(40, 55, 48, 0.98);
      border-color: rgba(17, 209, 108, 0.4);
    }

    .toast-error {
      border-left: 4px solid var(--error-color, #ef4444);
      background: rgba(55, 40, 40, 0.98);
      border-color: rgba(239, 68, 68, 0.4);
    }

    .toast-warning {
      border-left: 4px solid #fbbf24;
      background: rgba(55, 50, 40, 0.98);
      border-color: rgba(251, 191, 36, 0.4);
    }

    .toast-info {
      border-left: 4px solid var(--primary-color, #0888ff);
      background: rgba(40, 48, 55, 0.98);
      border-color: rgba(8, 136, 255, 0.4);
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .toast-icon {
      font-size: 1.25rem;
      font-weight: bold;
      flex-shrink: 0;
    }

    .toast-success .toast-icon {
      color: var(--success-color, #11d16c);
    }

    .toast-error .toast-icon {
      color: var(--error-color, #ef4444);
    }

    .toast-warning .toast-icon {
      color: #fbbf24;
    }

    .toast-info .toast-icon {
      color: var(--primary-color, #0888ff);
    }

    .toast-message {
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .toast-action {
      background: none;
      border: none;
      color: var(--primary-color, #0888ff);
      cursor: pointer;
      font-weight: 600;
      padding: 0;
      margin-left: 0.5rem;
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }

    .toast-action:hover {
      opacity: 0.8;
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--secondary-color, #94a3b8);
      cursor: pointer;
      padding: 0;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }

    .toast-close:hover {
      color: var(--text-color, #ffffff);
    }
  `]
})
export class CustomToastComponent {
  @Input()
  set config(value: ToastMessage | null) {
    this._config = value;
    this.cdr.markForCheck();
  }
  get config(): ToastMessage | null {
    return this._config;
  }
  private _config: ToastMessage | null = null;

  close: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  onClose(): void {
    this.close();
  }

  onAction(): void {
    if (this.config?.action) {
      this.config.action.callback();
      this.close();
    }
  }
}

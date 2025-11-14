import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalConfig {
  title?: string;
  content?: string;
  actions?: Array<{ label: string; action: () => void; style?: 'primary' | 'danger' | 'default' }>;
  closeOnBackdropClick?: boolean;
  closeButton?: boolean;
  width?: string;
}

@Component({
  selector: 'app-custom-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" [class.show]="true" (click)="onBackdropClick()">
      <div class="modal-container" [style.width]="config?.width || '500px'" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">{{ config?.title || 'Modal' }}</h2>
          <button *ngIf="config?.closeButton !== false" class="modal-close-btn" (click)="close()">
            ✕
          </button>
        </div>

        <div class="modal-content">
          {{ config?.content }}
          <ng-content></ng-content>
        </div>

        <div class="modal-actions" *ngIf="config?.actions && config?.actions?.length! > 0">
          <button
            *ngFor="let action of config?.actions!"
            [ngClass]="{
              'action-button': true,
              'primary': action.style === 'primary' || !action.style,
              'danger': action.style === 'danger',
              'default': action.style === 'default'
            }"
            (click)="executeAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      animation: fadeIn 0.3s ease forwards;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-container {
      background: var(--modal-bg, white);
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease forwards;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      color: var(--text-primary, #333);
      font-weight: 600;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-secondary, #999);
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }

    .modal-close-btn:hover {
      color: var(--text-primary, #333);
    }

    .modal-content {
      padding: 1.5rem;
      color: var(--text-primary, #333);
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid var(--border-color, #e0e0e0);
    }

    .action-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      font-weight: 500;
    }

    .action-button.primary {
      background: var(--primary, #007bff);
      color: white;
    }

    .action-button.primary:hover {
      background: var(--primary-dark, #0056b3);
    }

    .action-button.danger {
      background: var(--error, #dc3545);
      color: white;
    }

    .action-button.danger:hover {
      background: var(--error-dark, #c82333);
    }

    .action-button.default {
      background: var(--border-color, #e0e0e0);
      color: var(--text-primary, #333);
    }

    .action-button.default:hover {
      background: var(--hover-bg, #d0d0d0);
    }
  `]
})
export class CustomModalComponent {
  @Input() config: ModalConfig | null = null;
  @Output() closeEvent = new EventEmitter<void>();

  close: () => void = () => {};

  onBackdropClick(): void {
    if (this.config?.closeOnBackdropClick !== false) {
      this.close();
    }
  }

  executeAction(action: any): void {
    action.action();
    this.close();
  }
}

import { Injectable, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { CustomToastComponent } from '../components/custom-toast/custom-toast.component';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
  duration?: number;
  action?: { label: string; callback: () => void };
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: ComponentRef<CustomToastComponent>[] = [];
  private toastContainer: HTMLElement | null = null;

  constructor(private environmentInjector: EnvironmentInjector) {
    this.createToastContainer();
  }

  private createToastContainer(): void {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      this.toastContainer.style.position = 'fixed';
      this.toastContainer.style.bottom = '1rem';
      this.toastContainer.style.right = '1rem';
      this.toastContainer.style.zIndex = '2000';
      this.toastContainer.style.display = 'flex';
      this.toastContainer.style.flexDirection = 'column';
      this.toastContainer.style.gap = '0.75rem';
      document.body.appendChild(this.toastContainer);
    }
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000): void {
    const config: ToastMessage = { message, type, duration };
    this.createToast(config);
  }

  success(message: string, duration: number = 3000): void {
    this.createToast({ message, type: 'success', duration });
  }

  error(message: string, duration: number = 5000): void {
    this.createToast({ message, type: 'error', duration });
  }

  warning(message: string, duration: number = 4000): void {
    this.createToast({ message, type: 'warning', duration });
  }

  info(message: string, duration: number = 3000): void {
    this.createToast({ message, type: 'info', duration });
  }

  private createToast(config: ToastMessage): void {
    const componentRef = createComponent(CustomToastComponent, {
      environmentInjector: this.environmentInjector
    });

    const instance = componentRef.instance;
    instance.config = config;
    instance.close = () => this.removeToast(componentRef);

    if (this.toastContainer) {
      this.toastContainer.appendChild(componentRef.location.nativeElement);
    }

    componentRef.changeDetectorRef.markForCheck();
    this.toasts.push(componentRef);

    // Auto-close after duration
    if (config.duration) {
      setTimeout(() => {
        this.removeToast(componentRef);
      }, config.duration);
    }
  }

  private removeToast(componentRef: ComponentRef<CustomToastComponent>): void {
    const index = this.toasts.indexOf(componentRef);
    if (index > -1) {
      // Add closing animation class
      const element = componentRef.location.nativeElement;
      const toastEl = element.querySelector('.toast');
      if (toastEl) {
        toastEl.classList.add('closing');
      }

      // Wait for animation to complete before destroying
      setTimeout(() => {
        const currentIndex = this.toasts.indexOf(componentRef);
        if (currentIndex > -1) {
          this.toasts.splice(currentIndex, 1);
        }
        componentRef.destroy();
      }, 300);
    }
  }

  clear(): void {
    while (this.toasts.length) {
      const toast = this.toasts.pop();
      if (toast) {
        toast.destroy();
      }
    }
  }
}

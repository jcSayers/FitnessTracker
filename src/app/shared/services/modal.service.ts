import { Injectable, ComponentRef, Injector, createComponent, EnvironmentInjector } from '@angular/core';
import { CustomModalComponent } from '../components/custom-modal/custom-modal.component';

export interface ModalConfig {
  title?: string;
  content?: string;
  actions?: Array<{ label: string; action: () => void; style?: 'primary' | 'danger' | 'default' }>;
  closeOnBackdropClick?: boolean;
  closeButton?: boolean;
  width?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modals: ComponentRef<CustomModalComponent>[] = [];

  constructor(private environmentInjector: EnvironmentInjector) {}

  open(config: ModalConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const componentRef = createComponent(CustomModalComponent, {
        environmentInjector: this.environmentInjector
      });

      // Configure component inputs
      const instance = componentRef.instance;
      instance.config = config;
      instance.close = () => {
        this.closeModal(componentRef);
        resolve(null);
      };

      // Add to DOM
      document.body.appendChild(componentRef.location.nativeElement);
      componentRef.changeDetectorRef.markForCheck();

      this.modals.push(componentRef);
    });
  }

  closeAll(): void {
    while (this.modals.length) {
      const modal = this.modals.pop();
      if (modal) {
        modal.destroy();
      }
    }
  }

  private closeModal(componentRef: ComponentRef<CustomModalComponent>): void {
    const index = this.modals.indexOf(componentRef);
    if (index > -1) {
      this.modals.splice(index, 1);
    }
    componentRef.destroy();
  }
}

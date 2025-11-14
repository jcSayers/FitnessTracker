import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconService } from '../../services/icon.service';

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      class="svg-icon"
      [ngClass]="[sizeClass, colorClass]"
      [innerHTML]="icon"
      [attr.aria-label]="ariaLabel"
      role="img"
    ></svg>
  `,
  styles: [`
    .svg-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
    }

    .svg-icon.size-sm {
      width: 1rem;
      height: 1rem;
    }

    .svg-icon.size-lg {
      width: 2rem;
      height: 2rem;
    }

    .svg-icon.size-xl {
      width: 3rem;
      height: 3rem;
    }

    .svg-icon.color-primary {
      color: var(--primary, #007bff);
    }

    .svg-icon.color-danger {
      color: var(--error, #dc3545);
    }

    .svg-icon.color-success {
      color: var(--success, #28a745);
    }

    .svg-icon.color-warning {
      color: var(--warning, #ffc107);
    }

    .svg-icon.color-secondary {
      color: var(--text-secondary, #999);
    }
  `]
})
export class SvgIconComponent {
  @Input() name: string = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color: 'primary' | 'danger' | 'success' | 'warning' | 'secondary' | 'inherit' = 'inherit';
  @Input() ariaLabel: string = '';

  icon: any = '';

  constructor(private iconService: IconService) {}

  ngOnInit(): void {
    this.icon = this.iconService.getIcon(this.name);
  }

  get sizeClass(): string {
    if (this.size === 'sm') return 'size-sm';
    if (this.size === 'lg') return 'size-lg';
    if (this.size === 'xl') return 'size-xl';
    return '';
  }

  get colorClass(): string {
    if (this.color !== 'inherit') {
      return `color-${this.color}`;
    }
    return '';
  }
}

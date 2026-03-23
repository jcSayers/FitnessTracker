import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper">
      @if (variant === 'workout-card') {
        <div class="skeleton-card">
          <div class="skeleton skeleton-header"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton-tags">
            <div class="skeleton skeleton-tag"></div>
            <div class="skeleton skeleton-tag"></div>
          </div>
        </div>
      }
      @if (variant === 'stat-item') {
        <div class="skeleton-stat">
          <div class="skeleton skeleton-number"></div>
          <div class="skeleton skeleton-label"></div>
        </div>
      }
      @if (variant === 'history-item') {
        <div class="skeleton-history">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton-content">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      animation: fadeIn 0.2s ease-in;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.04) 0%,
        rgba(255, 255, 255, 0.08) 50%,
        rgba(255, 255, 255, 0.04) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .skeleton-card {
      padding: 20px;
      background: var(--card-bg-enhanced);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
    }

    .skeleton-header {
      height: 24px;
      width: 60%;
      margin-bottom: 12px;
    }

    .skeleton-text {
      height: 16px;
      margin-bottom: 8px;

      &.short {
        width: 40%;
      }
    }

    .skeleton-tags {
      display: flex;
      gap: 8px;
      margin: 16px 0;
    }

    .skeleton-tag {
      height: 24px;
      width: 80px;
      border-radius: 12px;
    }

    .skeleton-stat {
      text-align: center;
      background: var(--glass-bg-enhanced);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 12px;
      position: relative;
      overflow: hidden;
    }

    .skeleton-number {
      height: 32px;
      width: 60px;
      margin: 0 auto 8px;
    }

    .skeleton-label {
      height: 12px;
      width: 80px;
      margin: 0 auto;
    }

    .skeleton-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }

    .skeleton-history {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 16px;
      background: var(--card-bg-enhanced);
      border-radius: 12px;
      border: 1px solid var(--card-border);
      margin-bottom: 12px;
      position: relative;
      overflow: hidden;
    }

    .skeleton-content {
      flex: 1;
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() variant: 'workout-card' | 'stat-item' | 'history-item' = 'workout-card';
}

import { Component, Input, Output, EventEmitter, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-select-wrapper">
      <label *ngIf="label" class="custom-label">{{ label }}</label>
      <div class="custom-select-container">
        <button
          class="custom-select-trigger"
          [class.open]="isOpen"
          [class.error]="hasError"
          [disabled]="disabled"
          (click)="toggleDropdown()"
          (keydown)="onKeyDown($event)"
          #triggerButton
        >
          <span class="selected-value">
            {{ getSelectedLabel() }}
          </span>
          <span class="select-arrow">▼</span>
        </button>
        <div class="custom-select-dropdown" *ngIf="isOpen">
          <div class="select-options">
            <button
              *ngFor="let option of options"
              class="select-option"
              [class.selected]="option.value === value"
              (click)="selectOption(option)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
      <div *ngIf="hasError && errorMessage" class="custom-error">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .custom-select-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      margin-bottom: 1.25rem;
    }

    .custom-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #999);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .custom-select-container {
      position: relative;
    }

    .custom-select-trigger {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 0.375rem;
      background: var(--input-bg, #fff);
      color: var(--text-primary, #333);
      font-size: 1rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: inherit;
    }

    .custom-select-trigger:hover:not(:disabled) {
      border-color: var(--primary, #007bff);
    }

    .custom-select-trigger:focus {
      outline: none;
      border-color: var(--primary, #007bff);
      box-shadow: 0 0 0 3px var(--primary-light, rgba(0, 123, 255, 0.1));
    }

    .custom-select-trigger.open {
      border-color: var(--primary, #007bff);
    }

    .custom-select-trigger.error {
      border-color: var(--error, #dc3545);
    }

    .custom-select-trigger:disabled {
      background: var(--input-disabled-bg, #f5f5f5);
      color: var(--text-disabled, #999);
      cursor: not-allowed;
    }

    .selected-value {
      flex: 1;
    }

    .select-arrow {
      margin-left: 0.5rem;
      font-size: 0.75rem;
      transition: transform 0.2s ease;
    }

    .custom-select-trigger.open .select-arrow {
      transform: rotate(180deg);
    }

    .custom-select-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 0.375rem;
      background: var(--input-bg, #fff);
      z-index: 10;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .select-options {
      max-height: 250px;
      overflow-y: auto;
    }

    .select-option {
      width: 100%;
      padding: 0.75rem;
      border: none;
      background: transparent;
      color: var(--text-primary, #333);
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      font-size: 1rem;
    }

    .select-option:hover {
      background: var(--hover-bg, #f5f5f5);
    }

    .select-option.selected {
      background: var(--primary-light, rgba(0, 123, 255, 0.1));
      color: var(--primary, #007bff);
      font-weight: 500;
    }

    .custom-error {
      font-size: 0.75rem;
      color: var(--error, #dc3545);
      margin-top: 0.25rem;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: Array<{ label: string; value: any }> = [];
  @Input() hasError: boolean = false;
  @Input() errorMessage: string = '';
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<any>();
  @ViewChild('triggerButton') triggerButton!: ElementRef;

  value: any = null;
  isOpen: boolean = false;

  // ControlValueAccessor methods
  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value || null;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  selectOption(option: { label: string; value: any }): void {
    this.value = option.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.isOpen = false;
    this.triggerButton.nativeElement.focus();
  }

  getSelectedLabel(): string {
    const selected = this.options.find(opt => opt.value === this.value);
    return selected ? selected.label : 'Select an option';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.isOpen = true;
    } else if (event.key === 'Escape') {
      this.isOpen = false;
    }
  }
}

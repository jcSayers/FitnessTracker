import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-input-wrapper">
      <label *ngIf="label" class="custom-label" [class.floating]="isFocused || value">
        {{ label }}
      </label>
      <input
        class="custom-input"
        [type]="type"
        [value]="value"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [class.error]="hasError"
        [class.focused]="isFocused"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (input)="onInput($event)"
        (change)="onChange($event)"
      />
      <span *ngIf="suffix" class="custom-suffix">{{ suffix }}</span>
      <div *ngIf="hasError && errorMessage" class="custom-error">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .custom-input-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      margin-bottom: 1.25rem;
    }

    .custom-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #999);
      margin-bottom: 0.5rem;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .custom-label.floating {
      font-size: 0.75rem;
      color: var(--primary, #007bff);
      margin-bottom: 0.25rem;
    }

    .custom-input {
      padding: 0.75rem 0.5rem;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 0.375rem;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: var(--input-bg, #fff);
      color: var(--text-primary, #333);
      font-family: inherit;
    }

    .custom-input:focus {
      outline: none;
      border-color: var(--primary, #007bff);
      box-shadow: 0 0 0 3px var(--primary-light, rgba(0, 123, 255, 0.1));
    }

    .custom-input:disabled {
      background: var(--input-disabled-bg, #f5f5f5);
      color: var(--text-disabled, #999);
      cursor: not-allowed;
    }

    .custom-input.error {
      border-color: var(--error, #dc3545);
    }

    .custom-input.error:focus {
      box-shadow: 0 0 0 3px var(--error-light, rgba(220, 53, 69, 0.1));
    }

    .custom-suffix {
      position: absolute;
      right: 0.75rem;
      top: 2.25rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #999);
      pointer-events: none;
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
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true,
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() suffix: string = '';
  @Input() hasError: boolean = false;
  @Input() errorMessage: string = '';
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<string>();

  value: string = '';
  isFocused: boolean = false;

  // ControlValueAccessor methods
  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value || '';
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

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }
}

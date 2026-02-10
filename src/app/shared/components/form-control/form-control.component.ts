import { IconComponent } from '../icon/icon.component';
import { Component, Input, forwardRef, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, AbstractControl } from '@angular/forms';

let uniqueId = 0;

@Component({
    selector: 'app-form-control',
    standalone: true,
    imports: [IconComponent, CommonModule, ReactiveFormsModule],
    templateUrl: './form-control.component.html',
    styleUrls: ['./form-control.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormControlComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormControlComponent implements ControlValueAccessor {
    @Input() id = `form-control-${uniqueId++}`;
    @Input() label?: string;
    @Input() error?: string;
    @Input() hint?: string;
    @Input() iconLeft?: string;
    @Input() iconRight?: string;

    @Output() iconRightClick = new EventEmitter<void>();
    @Output() iconLeftClick = new EventEmitter<void>();

    @Input() type = 'text';
    @Input() placeholder = '';
    @Input() rows = 3;
    @Input() controlName?: string;
    @Input() control?: AbstractControl | null;
    @Input() disabled = false;
    @Input() min?: number | string;
    @Input() options?: { value: any, label: string }[] = [];

    // Password visibility toggle state
    passwordVisible = false;

    value: unknown = '';
    onChange: (value: unknown) => void = () => { /* empty */ };
    onTouched: () => void = () => { /* empty */ };

    // Computed input type - handles password visibility toggle
    get inputType(): string {
        if (this.type === 'password') {
            return this.passwordVisible ? 'text' : 'password';
        }
        return this.type;
    }

    // Icon to show for password toggle
    get passwordToggleIcon(): string {
        return this.passwordVisible ? 'visibility_off' : 'visibility';
    }

    // Check if this is a password field
    get isPasswordField(): boolean {
        return this.type === 'password';
    }

    // Toggle password visibility
    togglePasswordVisibility(): void {
        this.passwordVisible = !this.passwordVisible;
    }

    get errorMessage(): string | null {
        if (this.control && this.control.invalid && (this.control.dirty || this.control.touched)) {
            if (this.control.errors?.['required']) return 'هذا الحقل مطلوب';
            if (this.control.errors?.['email']) return 'البريد الإلكتروني غير صالح';
            if (this.control.errors?.['minlength']) return `يجب أن يكون ${this.control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
            if (this.control.errors?.['pattern']) return 'التنسيق غير صحيح';
            return 'قيمة غير صالحة';
        }
        return null;
    }

    writeValue(value: unknown): void {
        this.value = value;
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.value = value;
        this.onChange(value);
        this.onTouched();
    }

    onBlur(): void {
        this.onTouched();
    }
}

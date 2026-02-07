import { Component, Input, forwardRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl, AbstractControl } from '@angular/forms';

@Component({
    selector: 'app-form-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './form-control.component.html',
    styleUrls: ['./form-control.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormControlComponent),
            multi: true
        }
    ]
})
export class FormControlComponent implements ControlValueAccessor {
    @Input() label?: string;
    @Input() error?: string;
    @Input() hint?: string;
    @Input() iconLeft?: string;
    @Input() iconRight?: string;

    @Output() iconRightClick = new EventEmitter<void>();
    @Output() iconLeftClick = new EventEmitter<void>();

    @Input() type: string = 'text';
    @Input() placeholder: string = '';
    @Input() rows: number = 3;
    @Input() controlName?: string;
    @Input() control?: AbstractControl | null;
    @Input() disabled: boolean = false;
    @Input() min?: number | string;

    value: any = '';
    onChange: any = () => { };
    onTouched: any = () => { };

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

    writeValue(value: any): void {
        this.value = value;
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
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

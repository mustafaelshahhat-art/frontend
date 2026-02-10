import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, forwardRef, HostListener, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
    label: string;
    value: unknown;
    icon?: string;
}

@Component({
    selector: 'app-select',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectComponent implements ControlValueAccessor {
    private _options: SelectOption[] = [];

    @Input()
    set options(value: SelectOption[]) {
        this._options = value || [];
        this.syncSelectedLabel();
    }
    get options(): SelectOption[] {
        return this._options;
    }
    @Input() placeholder = 'اختر خياراً';
    @Input() label?: string;
    @Input() disabled = false;
    @Input() loading = false;
    @Input() error?: string;

    @Output() selectionChange = new EventEmitter<unknown>();

    @ViewChild('selectRef') selectRef!: ElementRef;

    isOpen = false;
    selectedValue: unknown = null;
    selectedLabel = '';

    onChange: (value: unknown) => void = () => { /* empty */ };
    onTouched: () => void = () => { /* empty */ };

    toggle(): void {
        if (this.disabled || this.loading) return;
        this.isOpen = !this.isOpen;
    }

    selectOption(option: SelectOption): void {
        this.selectedValue = option.value;
        this.selectedLabel = option.label;
        this.isOpen = false;
        this.onChange(this.selectedValue);
        this.selectionChange.emit(this.selectedValue);
    }

    writeValue(value: unknown): void {
        this.selectedValue = value;
        this.syncSelectedLabel(true);
    }

    private syncSelectedLabel(allowValueFallback = false): void {
        const value = this.selectedValue;
        const option = this._options.find(o => o.value === value);
        if (option) {
            this.selectedLabel = option.label;
            return;
        }

        if (allowValueFallback && value !== null && value !== undefined && value !== '') {
            this.selectedLabel = String(value);
            return;
        }

        this.selectedLabel = '';
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent): void {
        if (this.selectRef && !this.selectRef.nativeElement.contains(event.target as Node)) {
            this.isOpen = false;
        }
    }
}

import { Component, Input, Output, EventEmitter, forwardRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
    label: string;
    value: any;
    icon?: string;
}

@Component({
    selector: 'app-select',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SelectComponent),
            multi: true
        }
    ]
})
export class SelectComponent implements ControlValueAccessor {
    @Input() options: SelectOption[] = [];
    @Input() placeholder: string = 'اختر خياراً';
    @Input() label?: string;
    @Input() disabled: boolean = false;
    @Input() loading: boolean = false;
    @Input() error?: string;

    @Output() change = new EventEmitter<any>();

    @ViewChild('selectRef') selectRef!: ElementRef;

    isOpen = false;
    selectedValue: any = null;
    selectedLabel: string = '';

    onChange: any = () => { };
    onTouched: any = () => { };

    toggle(): void {
        if (this.disabled || this.loading) return;
        this.isOpen = !this.isOpen;
    }

    selectOption(option: SelectOption): void {
        this.selectedValue = option.value;
        this.selectedLabel = option.label;
        this.isOpen = false;
        this.onChange(this.selectedValue);
        this.change.emit(this.selectedValue);
    }

    writeValue(value: any): void {
        this.selectedValue = value;
        const option = this.options.find(o => o.value === value);
        this.selectedLabel = option ? option.label : '';
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

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent): void {
        if (this.selectRef && !this.selectRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }
}

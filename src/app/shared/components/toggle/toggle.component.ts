import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-toggle',
    standalone: true,
    imports: [CommonModule],
    template: `
        <label class="toggle-container" [class.disabled]="disabled">
            <input 
                type="checkbox" 
                [checked]="checked" 
                [disabled]="disabled"
                (change)="onToggle($event)"
            >
            <span class="slider" [class.active]="checked" [class.danger]="variant === 'danger' && checked">
                <span class="knob"></span>
            </span>
        </label>
    `,
    styles: [`
        .toggle-container {
            display: inline-block;
            position: relative;
            width: 44px;
            height: 24px;
            cursor: pointer;
            user-select: none;

            &.disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }

            input {
                opacity: 0;
                width: 0;
                height: 0;
            }
        }

        .slider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--bg-surface-lowest, #1e293b);
            border: 1px solid var(--border-visible, rgba(255, 255, 255, 0.1));
            transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 24px;

            &.active {
                background-color: var(--color-primary, #3b82f6);
                border-color: var(--color-primary, #3b82f6);
                
                .knob {
                    transform: translateX(20px);
                }

                &.danger {
                    background-color: var(--color-danger, #ef4444);
                    border-color: var(--color-danger, #ef4444);
                }
            }
        }

        .knob {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ToggleComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleComponent implements ControlValueAccessor {
    private readonly cdr = inject(ChangeDetectorRef);

    @Input() checked = false;
    @Input() disabled = false;
    @Input() variant: 'primary' | 'danger' = 'primary';
    @Output() change = new EventEmitter<boolean>();

    private onChange: (value: boolean) => void = () => { };
    private onTouched: () => void = () => { };

    onToggle(event: Event) {
        if (this.disabled) return;
        const input = event.target as HTMLInputElement;
        this.checked = input.checked;
        this.onChange(this.checked);
        this.onTouched();
        this.change.emit(this.checked);
        this.cdr.markForCheck();
    }

    // ControlValueAccessor methods
    writeValue(value: boolean): void {
        this.checked = !!value;
        this.cdr.markForCheck();
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        this.cdr.markForCheck();
    }
}

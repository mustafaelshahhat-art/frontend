import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-icon-button',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './icon-button.component.html',
    styleUrls: ['./icon-button.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconButtonComponent {
    @Input() icon!: string;
    @Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass' | 'surface' = 'ghost';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() tooltip = '';
    @Input() disabled = false;
    @Input() isLoading = false;
    // Alias for backward compatibility if needed, but prefer isLoading
    @Input() set loading(val: boolean) { this.isLoading = val; }

    @Input() type: 'button' | 'submit' | 'reset' = 'button';

    @Output() trigger = new EventEmitter<MouseEvent>();

    handleClick(event: MouseEvent) {
        if (!this.disabled && !this.isLoading) {
            this.trigger.emit(event);
        }
    }
}

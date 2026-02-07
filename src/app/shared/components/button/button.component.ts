import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss']
})
export class ButtonComponent {
    @Input() variant: 'primary' | 'gold' | 'danger' | 'ghost' | 'outline' | 'danger-ghost' | 'icon' = 'primary';
    @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
    @Input() type: 'button' | 'submit' | 'reset' = 'button';
    @Input() icon?: string;
    @Input() iconPos: 'left' | 'right' = 'left';
    @Input() isLoading = false;
    @Input() disabled = false;
    @Input() ariaLabel?: string;

    @HostBinding('class.full-width')
    @Input() fullWidth = false;

    @Output() onClick = new EventEmitter<MouseEvent>();
}

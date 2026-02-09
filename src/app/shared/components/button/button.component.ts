import { Component, Input, Output, EventEmitter, HostBinding, ElementRef, inject, AfterContentInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent implements AfterContentInit {
    private el = inject(ElementRef);

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

    @HostBinding('class.is-icon-only')
    isIconOnly = false;

    @Output() trigger = new EventEmitter<MouseEvent>();

    ngAfterContentInit() {
        this.checkIfIconOnly();
    }

    private checkIfIconOnly() {
        const text = this.el.nativeElement.textContent?.trim();
        this.isIconOnly = !!this.icon && !text;
    }
}

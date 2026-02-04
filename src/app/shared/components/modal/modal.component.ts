import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
    @Input() visible = false;
    @Input() title = '';
    @Input() icon?: string;
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() theme: 'default' | 'danger' = 'default';
    @Input() hasFooter = true;
    @Input() closeOnOverlay = true;

    @Output() onClose = new EventEmitter<void>();

    close() {
        this.onClose.emit();
    }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-action-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './action-card.component.html',
    styleUrls: ['./action-card.component.scss']
})
export class ActionCardComponent {
    @Input() title: string = '';
    @Input() description: string = '';
    @Input() icon: string = '';
    @Input() colorClass: string = 'primary';
    @Output() clicked = new EventEmitter<void>();

    handleClick() {
        this.clicked.emit();
    }
}

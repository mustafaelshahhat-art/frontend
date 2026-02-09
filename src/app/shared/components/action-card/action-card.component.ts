import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-action-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './action-card.component.html',
    styleUrls: ['./action-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionCardComponent {
    @Input() title = '';
    @Input() description = '';
    @Input() icon = '';
    @Input() colorClass = 'primary';
    @Output() clicked = new EventEmitter<void>();

    handleClick() {
        this.clicked.emit();
    }
}

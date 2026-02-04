import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './stat-card.component.html',
    styleUrls: ['./stat-card.component.scss']
})
export class StatCardComponent {
    @Input() label: string = '';
    @Input() value: string | number = '';
    @Input() icon: string = '';
    @Input() colorClass: string = 'primary';
}

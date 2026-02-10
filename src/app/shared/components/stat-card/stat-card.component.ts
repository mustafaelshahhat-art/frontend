import { IconComponent } from '../icon/icon.component';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './stat-card.component.html',
    styleUrls: ['./stat-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
    @Input() label = '';
    @Input() value: string | number = '';
    @Input() icon = '';
    @Input() colorClass = 'primary';
}

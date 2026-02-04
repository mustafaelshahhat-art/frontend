import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-welcome-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './welcome-card.component.html',
    styleUrls: ['./welcome-card.component.scss']
})
export class WelcomeCardComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
    @Input() icon: string = '';
    @Input() iconClass: string = 'primary';
    @Input() status: string = '';
    @Input() statusClass: string = 'status-dot-online';
    @Input() badgeClass: string = 'badge-success';
    @Input() statusIcon: string = '';
}

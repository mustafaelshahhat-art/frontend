import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchEventType } from '../../../../core/models/tournament.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permission } from '../../../../core/permissions/permissions.model';
import { IconButtonComponent } from '../../../../shared/components/icon-button/icon-button.component';

export interface TimelineEvent {
    id: string;
    type: MatchEventType;
    teamId: string;
    playerName?: string;
    minute?: number;
}

@Component({
    selector: 'app-match-timeline',
    standalone: true,
    imports: [CommonModule, HasPermissionDirective, IconButtonComponent],
    templateUrl: './match-timeline.component.html',
    styleUrls: ['./match-timeline.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchTimelineComponent {
    @Input() events: TimelineEvent[] = [];
    @Input() homeTeamId: string = '';
    @Input() homeTeamName: string = 'صاحب الأرض';
    @Input() awayTeamName: string = 'الضيف';

    // Permission for template usage
    Permission = Permission;

    @Output() deleteEvent = new EventEmitter<string>();

    onDelete(id: string): void {
        this.deleteEvent.emit(id);
    }

    getEventIcon(type: MatchEventType | string): string {
        const typeStr = String(type).toLowerCase();
        switch (typeStr) {
            case 'goal': return 'sports_soccer';
            case 'yellowcard':
            case 'yellow_card': return 'content_copy';
            case 'redcard':
            case 'red_card': return 'content_copy';
            case 'penalty': return 'sports_soccer';
            case 'owngoal':
            case 'own_goal': return 'block';
            default: return 'info';
        }
    }

    getEventLabel(type: MatchEventType | string): string {
        const typeStr = String(type).toLowerCase();
        switch (typeStr) {
            case 'goal': return 'هدف';
            case 'yellowcard':
            case 'yellow_card': return 'بطاقة صفراء';
            case 'redcard':
            case 'red_card': return 'بطاقة حمراء';
            case 'penalty': return 'ركلة جزاء';
            case 'owngoal':
            case 'own_goal': return 'هدف في مرماه';
            default: return 'حدث';
        }
    }

    trackById(index: number, item: TimelineEvent): string {
        return item.id;
    }
}

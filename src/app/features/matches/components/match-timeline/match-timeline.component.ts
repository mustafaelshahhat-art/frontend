import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchEventType } from '../../../../core/models/tournament.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permission } from '../../../../core/permissions/permissions.model';

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
    imports: [CommonModule, HasPermissionDirective],
    templateUrl: './match-timeline.component.html',
    styleUrls: ['./match-timeline.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchTimelineComponent {
    @Input() events: TimelineEvent[] = [];
    @Input() homeTeamId: string = '';

    // Permission for template usage
    Permission = Permission;

    @Output() deleteEvent = new EventEmitter<string>();

    onDelete(id: string): void {
        this.deleteEvent.emit(id);
    }

    getEventIcon(type: MatchEventType | string): string {
        const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
        switch (typeStr) {
            case MatchEventType.GOAL:
            case 'goal': return 'sports_soccer';
            case MatchEventType.YELLOW_CARD:
            case 'yellow_card': return 'content_copy';
            case MatchEventType.RED_CARD:
            case 'red_card': return 'content_copy'; // Should ideally specific icon or color
            case MatchEventType.PENALTY:
            case 'penalty': return 'sports_soccer';
            default: return 'info';
        }
    }

    getEventLabel(type: MatchEventType | string): string {
        const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
        switch (typeStr) {
            case MatchEventType.GOAL: return 'هدف';
            case MatchEventType.YELLOW_CARD: return 'بطاقة صفراء';
            case MatchEventType.RED_CARD: return 'بطاقة حمراء';
            case MatchEventType.PENALTY: return 'ركلة جزاء';
            case MatchEventType.OWN_GOAL: return 'هدف في مرماه';
            default: return 'حدث';
        }
    }

    trackById(index: number, item: TimelineEvent): string {
        return item.id;
    }
}

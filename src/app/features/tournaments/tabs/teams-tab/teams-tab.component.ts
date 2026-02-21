import { Component, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { TournamentDetailStore } from '../../stores/tournament-detail.store';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permission } from '../../../../core/permissions/permissions.model';
import { RegistrationStatus, TournamentStatus, TeamRegistration } from '../../../../core/models/tournament.model';
import { TournamentService } from '../../../../core/services/tournament.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { getTournamentStatusLabel, getRegStatusLabel, getRegStatusType } from '../../utils/tournament-status.utils';

@Component({
    selector: 'app-teams-tab',
    standalone: true,
    imports: [CommonModule, BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent, HasPermissionDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (store.tournament(); as t) {
        <div class="teams-grid">
            @for (reg of t.registrations; track reg.teamId) {
            <div class="team-card">
                <div class="team-info">
                    <h3>{{ reg.teamName }}</h3>
                    <div class="captain-info items-center">
                        <app-icon name="person" class="icon-sm"></app-icon>
                        <span>{{ reg.captainName }}</span>
                    </div>
                </div>
                <div class="team-footer">
                    <div class="flex-col gap-1 items-start">
                        <span class="date">مسجل: {{ reg.registeredAt | date:'yyyy/MM/dd' }}</span>
                        <app-badge [type]="getRegStatusType(reg.status)" size="sm">
                            {{ getRegStatusLabel(reg.status) }}
                        </app-badge>
                    </div>

                    <div *appHasPermission="Permission.MANAGE_TOURNAMENTS" class="admin-team-actions flex gap-1">
                        @if (reg.status === RegistrationStatus.WAITING_LIST && t.currentTeams < t.maxTeams) {
                        <app-button variant="primary" size="sm" icon="upgrade"
                            (click)="promoteTeam(reg)">ترقية</app-button>
                        }

                        @if (t.status !== TournamentStatus.COMPLETED &&
                             reg.status !== RegistrationStatus.ELIMINATED &&
                             reg.status === RegistrationStatus.APPROVED) {
                        <app-button variant="ghost" size="sm" icon="person_remove" class="text-danger"
                            (click)="$event.stopPropagation(); eliminateTeam(reg)"
                            title="إقصاء الفريق">إقصاء</app-button>
                        }
                    </div>
                </div>
            </div>
            } @empty {
            <app-empty-state icon="groups" title="لا يوجد فرق"
                description="لم يتم تسجيل أي فرق في هذه البطولة حالياً." />
            }
        </div>
        }
    `,
    styles: [`
        :host { display: block; }

        .teams-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: var(--space-4);

            @media (max-width: 768px) { grid-template-columns: 1fr; }
        }

        .team-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-xl);
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
            transition: box-shadow var(--transition-fast), border-color var(--transition-fast);

            &:hover {
                box-shadow: var(--shadow-md);
                border-color: var(--border-color-strong);
            }
        }

        .team-logo {
            display: flex;
        }

        .team-info {
            h3 {
                margin: 0 0 var(--space-1);
                font-size: var(--text-base);
                font-weight: var(--font-semibold);
                line-height: var(--leading-snug);
            }

            .captain-info {
                display: flex;
                gap: var(--space-1);
                font-size: var(--text-sm);
                color: var(--text-secondary);
                line-height: var(--leading-normal);
            }
        }

        .team-footer {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: var(--space-2);

            .date {
                font-size: var(--text-xs);
                color: var(--text-tertiary);
                line-height: var(--leading-normal);
            }
        }

        .admin-team-actions {
            display: flex;
            gap: var(--space-1);
        }
    `]
})
export class TeamsTabComponent {
    readonly store = inject(TournamentDetailStore);
    private readonly tournamentService = inject(TournamentService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly destroyRef = inject(DestroyRef);

    Permission = Permission;
    RegistrationStatus = RegistrationStatus;
    TournamentStatus = TournamentStatus;

    getRegStatusLabel(status: string): string { return getRegStatusLabel(status); }
    getRegStatusType(status: string): 'primary' | 'gold' | 'danger' | 'info' | 'warning' | 'success' | 'muted' | 'neutral' | 'live' {
        return getRegStatusType(status);
    }

    async approveRegistration(reg: TeamRegistration): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;
        try {
            await firstValueFrom(this.tournamentService.approveRegistration(t.id, reg.teamId));
            this.uiFeedback.success('تم التأكيد', `تم تأكيد تسجيل فريق ${reg.teamName} بنجاح`);
            this.store.reload(this.destroyRef);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل التأكيد', httpErr.error?.message || 'تعذّر تأكيد تسجيل الفريق.');
        }
    }

    async rejectRegistration(reg: TeamRegistration): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;
        const reason = window.prompt('يرجى إدخال سبب الرفض:');
        if (reason) {
            try {
                await firstValueFrom(this.tournamentService.rejectRegistration(t.id, reg.teamId, reason));
                this.uiFeedback.success('تم الرفض', `تم رفض تسجيل فريق ${reg.teamName}`);
                this.store.reload(this.destroyRef);
            } catch (err: unknown) {
                const httpErr = err as { error?: { message?: string } };
                this.uiFeedback.error('فشل الرفض', httpErr.error?.message || 'تعذّر رفض التسجيل.');
            }
        }
    }

    async promoteTeam(reg: TeamRegistration): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;
        try {
            await firstValueFrom(this.tournamentService.promoteWaitingTeam(t.id, reg.teamId));
            this.uiFeedback.success('تم الترقية', `تم نقل فريق ${reg.teamName} من قائمة الانتظار`);
            this.store.reload(this.destroyRef);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الترقية', httpErr.error?.message || 'تعذّر نقل الفريق.');
        }
    }

    async eliminateTeam(reg: TeamRegistration): Promise<void> {
        const t = this.store.tournament();
        if (!t) return;
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'إقصاء الفريق',
            `هل أنت متأكد من إقصاء فريق "${reg.teamName}" من البطولة؟`,
            'إقصاء الفريق',
            'danger'
        ));
        if (!confirmed) return;
        try {
            await firstValueFrom(this.tournamentService.eliminateTeam(t.id, reg.teamId));
            this.uiFeedback.success('تم الإقصاء', `تم إقصاء فريق ${reg.teamName} بنجاح`);
            this.store.reload(this.destroyRef);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الإقصاء', httpErr.error?.message || 'تعذّر إقصاء الفريق.');
        }
    }
}

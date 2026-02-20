import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TournamentService } from '../../../../core/services/tournament.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { Tournament, TeamRegistration, TournamentStatus, RegistrationStatus } from '../../../../core/models/tournament.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

interface GroupSlot {
    id: number;
    name: string;
    teams: TeamRegistration[];
}

@Component({
    selector: 'app-manual-draw',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonComponent,
        CardComponent,
        IconComponent,
        ModalComponent
    ],
    templateUrl: './manual-draw.component.html',
    styleUrls: ['./manual-draw.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualDrawComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private tournamentService = inject(TournamentService);
    private uiFeedback = inject(UIFeedbackService);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private navService = inject(ContextNavigationService);

    tournament = signal<Tournament | null>(null);
    registeredTeams = signal<TeamRegistration[]>([]);
    isLoading = signal(true);
    isSubmitting = signal(false);

    // Group assignment state
    unassignedTeams = signal<TeamRegistration[]>([]);
    groupAssignments = signal<GroupSlot[]>([]);

    // Knockout pairing state
    knockoutPairings = signal<{ home: TeamRegistration | null; away: TeamRegistration | null }[]>([]);
    knockoutSelectingSlot = signal<'home' | 'away' | null>(null);
    knockoutPendingHome = signal<TeamRegistration | null>(null);
    knockoutPendingAway = signal<TeamRegistration | null>(null);

    // Modal state
    showGroupModal = signal(false);
    selectedTeamForAssignment = signal<TeamRegistration | null>(null);
    assigningGroupId = signal<number | null>(null);

    // Knockout team-select modal
    showKnockoutModal = signal(false);

    isKnockout = computed(() => {
        const t = this.tournament();
        if (!t) return false;
        return t.format === 'KnockoutOnly' || t.format === 'KnockoutHomeAway' || t.status === TournamentStatus.QUALIFICATION_CONFIRMED;
    });

    isKnockoutStage = computed(() => {
        const t = this.tournament();
        return t?.status === TournamentStatus.QUALIFICATION_CONFIRMED;
    });

    // Computed: teams per group capacity
    teamsPerGroup = computed(() => {
        const t = this.tournament();
        const totalTeams = this.registeredTeams().length;
        const numGroups = t?.numberOfGroups || 1;
        return Math.ceil(totalTeams / numGroups);
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadTournament(id);
        }
    }

    async loadTournament(id: string): Promise<void> {
        this.isLoading.set(true);
        try {
            const t = await firstValueFrom(this.tournamentService.getTournamentById(id));
            if (!t) {
                this.uiFeedback.error('غير موجودة', 'البطولة غير موجودة أو ربما تم حذفها.');
                return;
            }
            this.tournament.set(t);
            this.setupLayout(t);
            await this.loadRegistrations(id);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.isLoading.set(false);
            this.uiFeedback.error('خطأ في تحميل البطولة', httpErr.error?.message || 'فشل في تحميل بيانات البطولة');
        }
    }

    setupLayout(t: Tournament): void {
        this.layoutOrchestrator.setTitle('إجراء القرعة يدوياً');
        this.layoutOrchestrator.setSubtitle(t.name);

        if (!this.isKnockout()) {
            const numGroups = t.numberOfGroups || 1;
            const initialGroups: GroupSlot[] = [];
            for (let i = 1; i <= numGroups; i++) {
                initialGroups.push({ id: i, name: `المجموعة ${i}`, teams: [] });
            }
            this.groupAssignments.set(initialGroups);
        }
    }

    async loadRegistrations(id: string): Promise<void> {
        try {
            const regs = await firstValueFrom(this.tournamentService.getRegistrations(id));
            let approved = regs.filter(r => r.status === RegistrationStatus.APPROVED);

            // If in QualificationConfirmed state, only show teams that actually qualified
            if (this.tournament()?.status === TournamentStatus.QUALIFICATION_CONFIRMED) {
                approved = approved.filter(r => r.isQualifiedForKnockout === true);
            }

            this.registeredTeams.set(approved);
            this.unassignedTeams.set([...approved]);
            this.isLoading.set(false);
        } catch {
            this.isLoading.set(false);
        }
    }

    // ─── Group Modal Flow ───

    /** Admin clicks a team → open modal to choose which group */
    openGroupModal(team: TeamRegistration): void {
        if (this.isSubmitting()) return;
        this.selectedTeamForAssignment.set(team);
        this.assigningGroupId.set(null);
        this.showGroupModal.set(true);
    }

    /** Select a group inside the modal */
    selectGroup(groupId: number): void {
        this.assigningGroupId.set(groupId);
    }

    /** Is a group full? */
    isGroupFull(group: GroupSlot): boolean {
        return group.teams.length >= this.teamsPerGroup();
    }

    /** Confirm assignment from modal */
    confirmGroupAssignment(): void {
        const team = this.selectedTeamForAssignment();
        const groupId = this.assigningGroupId();
        if (!team || groupId === null) return;

        this.groupAssignments.update(groups =>
            groups.map(g => g.id === groupId ? { ...g, teams: [...g.teams, team] } : g)
        );
        this.unassignedTeams.update(teams => teams.filter(t => t.teamId !== team.teamId));
        this.showGroupModal.set(false);
        this.selectedTeamForAssignment.set(null);
        this.assigningGroupId.set(null);
    }

    /** Remove team from group back to unassigned */
    removeFromGroup(groupId: number, team: TeamRegistration): void {
        if (this.isSubmitting()) return;
        this.groupAssignments.update(groups =>
            groups.map(g => g.id === groupId ? { ...g, teams: g.teams.filter(t => t.teamId !== team.teamId) } : g)
        );
        this.unassignedTeams.update(teams => [...teams, team]);
    }

    // ─── Knockout Modal Flow ───

    /** Open knockout team selector for home or away slot */
    openKnockoutSelector(slot: 'home' | 'away'): void {
        if (this.isSubmitting()) return;
        this.knockoutSelectingSlot.set(slot);
        this.showKnockoutModal.set(true);
    }

    /** Pick a team from the knockout modal */
    selectTeamForKnockout(team: TeamRegistration): void {
        const slot = this.knockoutSelectingSlot();
        if (!slot) return;

        if (slot === 'home') {
            this.knockoutPendingHome.set(team);
        } else {
            this.knockoutPendingAway.set(team);
        }
        this.unassignedTeams.update(teams => teams.filter(t => t.teamId !== team.teamId));
        this.showKnockoutModal.set(false);

        // Auto-create pairing when both filled
        if (this.knockoutPendingHome() && this.knockoutPendingAway()) {
            this.knockoutPairings.update(p => [...p, {
                home: this.knockoutPendingHome(),
                away: this.knockoutPendingAway()
            }]);
            this.knockoutPendingHome.set(null);
            this.knockoutPendingAway.set(null);
        }
    }

    /** Remove pairing, return teams to unassigned */
    removePairing(index: number): void {
        if (this.isSubmitting()) return;
        const pairing = this.knockoutPairings()[index];
        const returned: TeamRegistration[] = [];
        if (pairing.home) returned.push(pairing.home);
        if (pairing.away) returned.push(pairing.away);
        this.unassignedTeams.update(teams => [...teams, ...returned]);
        this.knockoutPairings.update(p => p.filter((_, i) => i !== index));
    }

    /** Cancel pending knockout pairing */
    cancelPendingSlot(slot: 'home' | 'away'): void {
        if (slot === 'home' && this.knockoutPendingHome()) {
            this.unassignedTeams.update(teams => [...teams, this.knockoutPendingHome()!]);
            this.knockoutPendingHome.set(null);
        } else if (slot === 'away' && this.knockoutPendingAway()) {
            this.unassignedTeams.update(teams => [...teams, this.knockoutPendingAway()!]);
            this.knockoutPendingAway.set(null);
        }
    }

    // ─── Submit ───

    submitDraw(): void {
        const t = this.tournament();
        if (!t || this.isSubmitting()) return;

        if (this.unassignedTeams().length > 0) {
            this.uiFeedback.warning('تنبيه', 'يجب توزيع جميع الفرق أولاً.');
            return;
        }

        this.isSubmitting.set(true);

        if (this.isKnockout()) {
            this.submitKnockoutDraw(t);
        } else {
            this.submitGroupDraw(t);
        }
    }

    private async submitGroupDraw(t: Tournament): Promise<void> {
        const assignments = this.groupAssignments().map(g => ({
            groupId: g.id,
            teamIds: g.teams.map(team => team.teamId)
        }));

        try {
            await firstValueFrom(this.tournamentService.assignGroups(t.id, assignments));
            await firstValueFrom(this.tournamentService.generateManualGroupMatches(t.id));
            this.uiFeedback.success('تم بنجاح', 'تم توزيع الفرق وتوليد مباريات المجموعات بنجاح.');
            this.layoutOrchestrator.reset();
            this.navService.navigateTo(['tournaments', t.id]);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.isSubmitting.set(false);
            this.uiFeedback.error('خطأ', httpErr.error?.message || 'فشل في حفظ المجموعات أو توليد المواجهات');
        }
    }

    private async submitKnockoutDraw(t: Tournament): Promise<void> {
        const pairings = this.knockoutPairings().map(p => ({
            homeTeamId: p.home?.teamId ?? '',
            awayTeamId: p.away?.teamId ?? '',
            roundNumber: 1,
            stageName: 'Round 1'
        }));

        try {
            // QualificationConfirmed = came from group stage → use manual-next-round/1
            // KnockoutOnly/KnockoutHomeAway = pure knockout tournament → use manual-knockout-pairings
            if (this.isKnockoutStage()) {
                await firstValueFrom(this.tournamentService.manualNextRound(t.id, 1, pairings));
            } else {
                await firstValueFrom(this.tournamentService.createManualKnockoutMatches(t.id, pairings));
            }
            this.uiFeedback.success('تم بنجاح', 'تم إنشاء مواجهات خروج المغلوب بنجاح.');
            this.layoutOrchestrator.reset();
            this.navService.navigateTo(['tournaments', t.id]);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.isSubmitting.set(false);
            this.uiFeedback.error('فشل إنشاء المواجهات', httpErr.error?.message || 'تعذّر إنشاء مواجهات خروج المغلوب.');
        }
    }

    cancel(): void {
        const t = this.tournament();
        this.layoutOrchestrator.reset();
        if (t) {
            this.navService.navigateTo(['tournaments', t.id]);
        } else {
            this.navService.navigateTo('tournaments');
        }
    }

    trackByTeamId(_index: number, team: TeamRegistration): string {
        return team.teamId;
    }

    trackByGroupId(_index: number, group: GroupSlot): number {
        return group.id;
    }

    trackByIndex(index: number): number {
        return index;
    }
}

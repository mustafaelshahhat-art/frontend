import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, signal, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContextNavigationService } from '../../../core/navigation/context-navigation.service';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { SmartImageComponent } from '../../../shared/components/smart-image/smart-image.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { TeamService } from '../../../core/services/team.service';
import { Team } from '../../../core/models/team.model';
import { TeamStore } from '../../../core/stores/team.store';
import { PagedResult } from '../../../core/models/pagination.model';

import { StatusConfig } from '../../../shared/utils/status-labels';

type TeamFilterValue = 'all' | 'active' | 'inactive';

@Component({
    selector: 'app-teams-list',
    standalone: true,
    imports: [
        CommonModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        SmartImageComponent,
        TableComponent
    ],
    templateUrl: './teams-list.component.html',
    styleUrls: ['./teams-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamsListComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly teamService = inject(TeamService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly teamStore: TeamStore = inject(TeamStore);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);
    private readonly navService = inject(ContextNavigationService);

    currentFilter = signal<TeamFilterValue>('all');

    // Store handles loading state mostly, but for initial load we can track it
    isLoading = computed(() => this.teamStore.isLoading());

    filters = [
        { value: 'all', label: 'الكل' },
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' }
    ];

    // Derived State
    filteredTeams = computed(() => {
        const allTeams = this.teamStore.teams();
        const filter = this.currentFilter();

        if (filter === 'active') {
            return allTeams.filter((t: Team) => t.isActive);
        } else if (filter === 'inactive') {
            return allTeams.filter((t: Team) => !t.isActive);
        }
        return allTeams;
    });

    columns: TableColumn[] = [];

    @ViewChild('teamInfo') teamInfo!: TemplateRef<unknown>;
    @ViewChild('captainInfo') captainInfo!: TemplateRef<unknown>;
    @ViewChild('playersInfo') playersInfo!: TemplateRef<unknown>;
    @ViewChild('adminStatusInfo') adminStatusInfo!: TemplateRef<unknown>;
    @ViewChild('actionsInfo') actionsInfo!: TemplateRef<unknown>;
    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;

    ngOnInit(): void {
        this.layoutOrchestrator.setTitle('إدارة الفرق');
        this.layoutOrchestrator.setSubtitle('استعراض وإدارة الفرق المسجلة في البطولة');
        this.loadTeams();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'team', label: 'الفريق', template: this.teamInfo },
            { key: 'captain', label: 'الكابتن', template: this.captainInfo },
            { key: 'players', label: 'عدد اللاعبين', template: this.playersInfo },
            { key: 'status', label: 'الحالة الإدارية', template: this.adminStatusInfo },
            { key: 'actions', label: 'إجراءات', width: '150px', template: this.actionsInfo }
        ];

        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.layoutOrchestrator.setFilters(this.filtersTemplate);
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    loadTeams(): void {
        this.teamStore.setLoading(true);
        this.teamService.getAllTeams().subscribe({
            next: (data: PagedResult<Team>) => {
                this.teamStore.setTeams(data);
                // cdr handled by signal updates
            },
            error: (err) => {
                this.teamStore.setError(err.message);
                this.teamStore.setLoading(false);
            }
        });
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as TeamFilterValue);
    }

    requestToggleStatus(team: Team): void {
        const newStatus = !team.isActive;
        const title = !newStatus ? 'تعطيل الفريق' : 'تفعيل الفريق';
        const message = !newStatus
            ? `هل أنت متأكد من رغبتك في تعطيل فريق "${team.name}"؟ لن يتمكن الفريق من تعديل بياناته أو اللعب مؤقتاً.`
            : `هل أنت متأكد من رغبتك في تفعيل فريق "${team.name}"؟ سيتمكن الفريق من المشاركة في البطولة فوراً.`;
        const confirmText = !newStatus ? 'تعطيل الفريق' : 'تفعيل الآن';

        this.uiFeedback.confirm(title, message, confirmText, !newStatus ? 'danger' : 'info').subscribe((confirmed: boolean) => {
            if (confirmed) {
                const action$ = !newStatus
                    ? this.teamService.disableTeam(team.id)
                    : this.teamService.activateTeam(team.id);

                action$.subscribe({
                    next: () => {
                        this.uiFeedback.success('تم التحديث', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} الفريق بنجاح`);
                        // Refresh to sync state
                        this.loadTeams();
                    },
                    error: () => this.uiFeedback.error('خطأ', 'فشل في تحديث حالة الفريق')
                });
            }
        });
    }

    requestDelete(team: Team): void {
        this.uiFeedback.confirm(
            'حذف الفريق نهائياً',
            `هل أنت متأكد من حذف فريق "${team.name}"؟ هذا الإجراء سيقوم بمسح كافة بيانات الفريق ولا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ).subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.teamService.deleteTeam(team.id).subscribe({
                    next: () => {
                        this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                        // Store update happens via RealTime 'TeamDeleted' event automatically
                    },
                    error: (err) => {
                        const msg = err.error?.detail || err.error?.message || 'فشل في حذف الفريق';
                        this.uiFeedback.error('خطأ', msg);
                    }
                });
            }
        });
    }

    viewTeam(team: Team): void {
        this.navService.navigateTo(['teams', team.id], { state: { team } });
    }

    getTeamStatusConfig(isActive: boolean | undefined): StatusConfig {
        return isActive ?
            { label: 'نشط', variant: 'success', icon: 'check_circle' } :
            { label: 'معطل', variant: 'danger', icon: 'block' };
    }
}


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
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { TeamService } from '../../../core/services/team.service';
import { Team } from '../../../core/models/team.model';
import { TeamStore } from '../../../core/stores/team.store';
import { PagedResult } from '../../../core/models/pagination.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { createClientPagination, PaginationSource } from '../../../shared/data-access/paginated-data-source';

import { StatusConfig } from '../../../shared/utils/status-labels';
import { firstValueFrom } from 'rxjs';

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
        TableComponent,
        PaginationComponent
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

    // Pagination — slices filteredTeams client-side
    pager: PaginationSource<Team> = createClientPagination(this.filteredTeams, { pageSize: 20 });

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

    async loadTeams(): Promise<void> {
        this.teamStore.setLoading(true);
        try {
            const data = await firstValueFrom(this.teamService.getAllTeams(1, 500));
            this.teamStore.setTeams(data);
        } catch (e: unknown) {
            const httpErr = e as { message?: string };
            this.teamStore.setError(httpErr.message ?? null);
            this.teamStore.setLoading(false);
        }
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as TeamFilterValue);
        this.pager.loadPage(1);
    }

    async requestToggleStatus(team: Team): Promise<void> {
        const newStatus = !team.isActive;
        const title = !newStatus ? 'تعطيل الفريق' : 'تفعيل الفريق';
        const message = !newStatus
            ? `هل أنت متأكد من رغبتك في تعطيل فريق "${team.name}"؟ لن يتمكن الفريق من تعديل بياناته أو اللعب مؤقتاً.`
            : `هل أنت متأكد من رغبتك في تفعيل فريق "${team.name}"؟ سيتمكن الفريق من المشاركة في البطولة فوراً.`;
        const confirmText = !newStatus ? 'تعطيل الفريق' : 'تفعيل الآن';

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(title, message, confirmText, !newStatus ? 'danger' : 'info'));
        if (!confirmed) return;

        try {
            await firstValueFrom(
                !newStatus
                    ? this.teamService.disableTeam(team.id)
                    : this.teamService.activateTeam(team.id)
            );
            this.uiFeedback.success('تم التحديث', `تم ${newStatus ? 'تفعيل' : 'تعطيل'} الفريق بنجاح`);
            // Refresh to sync state
            this.loadTeams();
        } catch {
            this.uiFeedback.error('فشل التحديث', 'تعذّر تحديث حالة الفريق. يرجى المحاولة مرة أخرى.');
        }
    }

    async requestDelete(team: Team): Promise<void> {
        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف الفريق نهائياً',
            `هل أنت متأكد من حذف فريق "${team.name}"؟ هذا الإجراء سيقوم بمسح كافة بيانات الفريق ولا يمكن التراجع عنه.`,
            'حذف نهائي',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.teamService.deleteTeam(team.id));
            this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
            // Store update happens via RealTime 'TeamDeleted' event automatically
        } catch (e: unknown) {
            const httpErr = e as { error?: { detail?: string; message?: string } };
            const msg = httpErr.error?.detail || httpErr.error?.message || 'تعذّر حذف الفريق. يرجى المحاولة مرة أخرى.';
            this.uiFeedback.error('فشل الحذف', msg);
        }
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


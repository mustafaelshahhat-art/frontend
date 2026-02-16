import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { AnalyticsService, Activity } from '../../../core/services/analytics.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { createClientPagination, PaginationSource } from '../../../shared/data-access/paginated-data-source';

@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [
        CommonModule,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        TableComponent,
        FilterComponent,
        TimeAgoPipe,
        PaginationComponent
    ],
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityLogComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly analyticsService = inject(AnalyticsService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly adminLayout = inject(LayoutOrchestratorService);

    logs = signal<Activity[]>([]);
    isLoading = signal(true);
    columns: TableColumn[] = [];

    filters = [
        { label: 'الكل', value: 'all' },
        { label: 'المستخدمين', value: 'user' },
        { label: 'الفرق', value: 'team' },
        { label: 'البطولات', value: 'tournament' },
        { label: 'المباريات', value: 'match' },

        { label: 'الدفع', value: 'payment' }
    ];
    currentFilter = signal('all');

    filteredLogs = computed(() => {
        const allLogs = this.logs();
        const filter = this.currentFilter();
        if (filter === 'all') return allLogs;
        const f = filter.toLowerCase();
        return allLogs.filter(log => {
            const type = (log.type || '').toLowerCase();
            const status = (log.status || '').toLowerCase();
            return type.includes(f) || status.includes(f);
        });
    });

    // Pagination — slices filteredLogs client-side
    pager: PaginationSource<Activity> = createClientPagination(this.filteredLogs, { pageSize: 20 });

    setFilter(value: unknown): void {
        this.currentFilter.set(value as string);
        this.pager.loadPage(1);
    }

    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;
    @ViewChild('userInfo') userInfo!: TemplateRef<unknown>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<unknown>;
    @ViewChild('timeInfo') timeInfo!: TemplateRef<unknown>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<unknown>;

    ngOnInit(): void {
        this.adminLayout.setTitle('إحصائيات النشاط');
        this.adminLayout.setSubtitle('سجل بجميع العمليات والإجراءات التي تمت في النظام');
        this.loadLogs();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'userName', label: 'المستخدم', template: this.userInfo },
            { key: 'message', label: 'العملية', template: this.actionInfo },
            { key: 'time', label: 'الوقت', template: this.timeInfo },
            { key: 'type', label: 'التصنيف', template: this.statusInfo }
        ];

        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.adminLayout.setFilters(this.filtersTemplate);
            this.cdr.markForCheck();
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    loadLogs(): void {
        this.isLoading.set(true);
        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                this.logs.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.logs.set([]);
                this.isLoading.set(false);
            }
        });
    }

    getBadgeType(type: string): 'success' | 'warning' | 'danger' | 'neutral' {
        const t = (type || '').toLowerCase();

        // Critical / Danger
        if (t.includes('inactive') || t.includes('disabled') || t.includes('deactivated') ||
            t.includes('cancelled') || t.includes('removed') || t.includes('deleted') ||
            t.includes('rejected')) return 'danger';

        // Success
        if (t.includes('active') || t.includes('activated') || t.includes('approved') ||
            t.includes('login') || t.includes('registered') || t.includes('created') ||
            t.includes('payment') || t.includes('started') || t.includes('submitted')) return 'success';

        // Warning
        if (t.includes('match') || t.includes('score') || t.includes('event') ||
            t.includes('postponed') || t.includes('rescheduled') || t.includes('updated')) return 'warning';

        return 'neutral';
    }

    getStatusLabel(type: string): string {
        const t = (type || '').toUpperCase(); // Codes are uppercase

        if (t.includes('USER') || t.includes('ADMIN') || t.includes('PASSWORD') || t.includes('AVATAR')) return 'مستخدم';
        if (t.includes('TEAM')) return 'فريق';
        if (t.includes('TOURNAMENT')) return 'بطولة';
        if (t.includes('MATCH')) return 'مباراة';

        if (t.includes('PAYMENT')) return 'دفع';

        // Legacy Fallback (Arabic or lowercase)
        if (t.includes('مباراة') || t.includes('match')) return 'مباراة';
        if (t.includes('فريق') || t.includes('team')) return 'فريق';
        if (t.includes('مستخدم') || t.includes('user')) return 'مستخدم';
        if (t.includes('بطولة') || t.includes('tournament')) return 'بطولة';

        return type;
    }
}


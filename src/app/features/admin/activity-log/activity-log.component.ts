import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { AnalyticsService, Activity, ActivityFilterParams } from '../../../core/services/analytics.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

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

    // ── Server-side pagination state ──
    activities = signal<Activity[]>([]);
    totalCount = signal(0);
    currentPage = signal(1);
    readonly pageSize = 20;
    isLoading = signal(true);
    columns: TableColumn[] = [];

    // Computed pagination
    totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize) || 1);
    hasPreviousPage = computed(() => this.currentPage() > 1);
    hasNextPage = computed(() => this.currentPage() < this.totalPages());
    paginationSummary = computed(() => {
        const total = this.totalCount();
        const page = this.currentPage();
        const start = (page - 1) * this.pageSize + 1;
        const end = Math.min(page * this.pageSize, total);
        return total > 0 ? `${start}-${end} من ${total}` : '';
    });

    // ── Entity type filter (English values for API) ──
    filters = [
        { label: 'الكل', value: 'all', icon: 'all_inclusive' },
        { label: 'المستخدمين', value: 'User', icon: 'person' },
        { label: 'الفرق', value: 'Team', icon: 'groups' },
        { label: 'البطولات', value: 'Tournament', icon: 'emoji_events' },
        { label: 'المباريات', value: 'Match', icon: 'sports_soccer' },
        { label: 'النظام', value: 'System', icon: 'admin_panel_settings' },
        { label: 'المدفوعات', value: 'Payment', icon: 'payments' }
    ];
    currentFilter = signal('all');

    // ── Severity filter ──
    severityFilters = [
        { label: 'الكل', value: 'all', icon: 'all_inclusive' },
        { label: 'معلومات', value: '0', icon: 'info' },
        { label: 'تحذير', value: '1', icon: 'warning' },
        { label: 'حرج', value: '2', icon: 'error' }
    ];
    currentSeverityFilter = signal('all');

    setFilter(value: unknown): void {
        this.currentFilter.set(value as string);
        this.currentPage.set(1);
        this.loadLogs();
    }

    setSeverityFilter(value: unknown): void {
        this.currentSeverityFilter.set(value as string);
        this.currentPage.set(1);
        this.loadLogs();
    }

    loadPage(page: number): void {
        this.currentPage.set(page);
        this.loadLogs();
    }

    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;
    @ViewChild('userInfo') userInfo!: TemplateRef<unknown>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<unknown>;
    @ViewChild('timeInfo') timeInfo!: TemplateRef<unknown>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<unknown>;
    @ViewChild('severityInfo') severityInfo!: TemplateRef<unknown>;

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
            { key: 'severity', label: 'الأهمية', template: this.severityInfo },
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
        const params: ActivityFilterParams = {
            page: this.currentPage(),
            pageSize: this.pageSize
        };
        const entityType = this.currentFilter();
        if (entityType !== 'all') params.entityType = entityType;
        const severity = this.currentSeverityFilter();
        if (severity !== 'all') params.minSeverity = parseInt(severity, 10);

        this.analyticsService.getRecentActivities(params).subscribe({
            next: (result) => {
                this.activities.set(result.items);
                this.totalCount.set(result.totalCount);
                this.isLoading.set(false);
            },
            error: () => {
                this.activities.set([]);
                this.totalCount.set(0);
                this.isLoading.set(false);
            }
        });
    }

    getBadgeType(type: string): 'success' | 'warning' | 'danger' | 'neutral' {
        const badgeMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
            'مستخدم': 'success',
            'فريق': 'neutral',
            'بطولة': 'warning',
            'مباراة': 'danger',
            'إدارة': 'neutral',
            'دفع': 'success',
            'زائر': 'neutral',
            'نظام': 'warning'
        };
        return badgeMap[type] ?? 'neutral';
    }

    getSeverityBadge(severity?: string): { type: 'success' | 'warning' | 'danger' | 'neutral'; label: string } {
        switch (severity) {
            case 'critical': return { type: 'danger', label: 'حرج' };
            case 'warning': return { type: 'warning', label: 'تحذير' };
            default: return { type: 'neutral', label: 'معلومات' };
        }
    }
}
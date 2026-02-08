import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { AnalyticsService, Activity } from '../../core/services/analytics.service';
import { TableComponent, TableColumn } from '../../shared/components/table/table.component';

import { FilterComponent } from '../../shared/components/filter/filter.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [
        CommonModule,
        PageHeaderComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        TableComponent,
        FilterComponent,
        TimeAgoPipe
    ],
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogComponent implements OnInit, AfterViewInit {
    private readonly analyticsService = inject(AnalyticsService);
    private readonly cdr = inject(ChangeDetectorRef);

    logs: Activity[] = [];
    isLoading = true;
    columns: TableColumn[] = [];

    filters = [
        { label: 'الكل', value: 'all' },
        { label: 'المستخدمين', value: 'user' },
        { label: 'الفرق', value: 'team' },
        { label: 'البطولات', value: 'tournament' },
        { label: 'المباريات', value: 'match' },
        { label: 'الاعتراضات', value: 'objection' },
        { label: 'الدفع', value: 'payment' }
    ];
    currentFilter = 'all';

    get filteredLogs(): Activity[] {
        if (this.currentFilter === 'all') return this.logs;
        const filter = this.currentFilter.toLowerCase();
        return this.logs.filter(log => {
            const type = (log.type || '').toLowerCase();
            const status = (log.status || '').toLowerCase();
            return type.includes(filter) || status.includes(filter);
        });
    }

    setFilter(value: string): void {
        this.currentFilter = value;
    }

    @ViewChild('userInfo') userInfo!: TemplateRef<any>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<any>;
    @ViewChild('timeInfo') timeInfo!: TemplateRef<any>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<any>;

    ngOnInit(): void {
        this.loadLogs();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'userName', label: 'المستخدم', template: this.userInfo },
            { key: 'message', label: 'العملية', template: this.actionInfo },
            { key: 'time', label: 'الوقت', template: this.timeInfo },
            { key: 'type', label: 'التصنيف', template: this.statusInfo }
        ];
        this.cdr.detectChanges();
    }

    loadLogs(): void {
        this.isLoading = true;
        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                queueMicrotask(() => {
                    this.logs = data;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                queueMicrotask(() => {
                    this.logs = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    getBadgeType(type: string): 'success' | 'warning' | 'danger' | 'neutral' {
        const t = (type || '').toLowerCase();

        // Critical / Danger
        if (t.includes('inactive') || t.includes('disabled') || t.includes('deactivated') ||
            t.includes('cancelled') || t.includes('removed') || t.includes('deleted') ||
            t.includes('rejected') || t.includes('objection')) return 'danger';

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
        if (t.includes('OBJECTION')) return 'اعتراض';
        if (t.includes('PAYMENT')) return 'دفع';

        // Legacy Fallback (Arabic or lowercase)
        if (t.includes('مباراة') || t.includes('match')) return 'مباراة';
        if (t.includes('فريق') || t.includes('team')) return 'فريق';
        if (t.includes('مستخدم') || t.includes('user')) return 'مستخدم';
        if (t.includes('بطولة') || t.includes('tournament')) return 'بطولة';

        return type;
    }
}


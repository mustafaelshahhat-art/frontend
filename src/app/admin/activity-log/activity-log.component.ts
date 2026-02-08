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
        if (t.includes('activated')) return 'success';
        if (t.includes('deactivated') || t.includes('disabled') || t.includes('closed')) return 'danger';
        if (t.includes('login') || t.includes('logged in')) return 'success';
        if (t.includes('user')) return 'success';
        if (t.includes('team')) return 'neutral';
        if (t.includes('tournament')) return 'neutral';
        if (t.includes('match')) return 'warning';
        if (t.includes('objection')) return 'danger';
        if (t.includes('payment') || t.includes('registration')) return 'success';
        return 'neutral';
    }

    getStatusLabel(type: string): string {
        const t = type.toLowerCase();
        if (t.includes('team activated') || t.includes('team_activated')) return 'تفعيل فريق';
        if (t.includes('team deactivated') || t.includes('team_deactivated') || t.includes('team disabled')) return 'تعطيل فريق';
        if (t.includes('login') || t.includes('logged in')) return 'دخول';
        if (t.includes('user created')) return 'مستخدم جديد';
        if (t.includes('tournament created')) return 'إنشاء بطولة';
        if (t.includes('registration closed')) return 'إغلاق التسجيل';
        if (t.includes('registration approved')) return 'قبول تسجيل';
        if (t.includes('payment created')) return 'دفع';

        switch (t) {
            case 'user': return 'مستخدم';
            case 'team': return 'فريق';
            case 'tournament': return 'بطولة';
            case 'match': return 'مباراة';
            case 'objection': return 'اعتراض';
            default: return type;
        }
    }
}


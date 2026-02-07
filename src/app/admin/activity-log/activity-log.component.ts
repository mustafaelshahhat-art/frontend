import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { AnalyticsService, Activity } from '../../core/services/analytics.service';
import { TableComponent, TableColumn } from '../../shared/components/table/table.component';

@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [
        CommonModule,
        PageHeaderComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        TableComponent
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

    @ViewChild('userInfo') userInfo!: TemplateRef<any>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<any>;
    @ViewChild('timeInfo') timeInfo!: TemplateRef<any>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<any>;

    ngOnInit(): void {
        this.loadLogs();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'user', label: 'المستخدم', template: this.userInfo },
            { key: 'action', label: 'العملية', template: this.actionInfo },
            { key: 'time', label: 'الوقت', template: this.timeInfo },
            { key: 'status', label: 'الحالة', template: this.statusInfo }
        ];
        this.cdr.detectChanges();
    }

    loadLogs(): void {
        this.isLoading = true;
        this.analyticsService.getRecentActivities().subscribe({
            next: (data) => {
                setTimeout(() => {
                    this.logs = data;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.logs = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    getBadgeType(type: string): 'success' | 'warning' | 'danger' | 'neutral' {
        // TODO: Map activity type to badge type
        switch (type) {
            case 'user': return 'success';
            case 'tournament': return 'neutral';
            case 'match': return 'warning';
            case 'objection': return 'danger';
            default: return 'neutral';
        }
    }

    getStatusLabel(type: string): string {
        // TODO: Map activity type to label
        return type;
    }
}


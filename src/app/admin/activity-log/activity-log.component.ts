import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';

interface ActivityLog {
    userName: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
}

@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [
        CommonModule,
        PageHeaderComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent
    ],
    templateUrl: './activity-log.component.html',
    styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogComponent implements OnInit {
    logs: ActivityLog[] = [];
    isLoading = true;

    ngOnInit(): void {
        this.loadLogs();
    }

    loadLogs(): void {
        this.isLoading = true;
        // Simulate API call
        setTimeout(() => {
            this.logs = [
                { userName: 'أحمد المسؤول', action: 'تغيير حالة البطولة', timestamp: new Date(), status: 'success' },
                { userName: 'سارة المشرف', action: 'إضافة مستخدم جديد', timestamp: new Date(Date.now() - 3600000), status: 'success' },
                { userName: 'أحمد المسؤول', action: 'تعديل نتيجة مباراة', timestamp: new Date(Date.now() - 7200000), status: 'success' }
            ];
            this.isLoading = false;
        }, 500);
    }

    getBadgeType(status: string): 'success' | 'warning' | 'danger' {
        switch (status) {
            case 'success': return 'success';
            case 'warning': return 'warning';
            case 'error': return 'danger';
            default: return 'success';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'success': return 'ناجحة';
            case 'warning': return 'تحذير';
            case 'error': return 'فشل';
            default: return 'ناجحة';
        }
    }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ActionCardComponent } from '../../shared/components/action-card/action-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { WelcomeCardComponent } from '../../shared/components/welcome-card/welcome-card.component';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        StatCardComponent,
        ActionCardComponent,
        PageHeaderComponent,
        WelcomeCardComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
    private readonly router = inject(Router);

    stats = [
        { label: 'إجمالي المستخدمين', value: '1,250', icon: 'groups', colorClass: 'info' },
        { label: 'البطولات النشطة', value: '4', icon: 'emoji_events', colorClass: 'primary' },
        { label: 'المباريات اليوم', value: '8', icon: 'sports_soccer', colorClass: 'gold' },
        { label: 'اعتراضات معلقة', value: '5', icon: 'report_problem', colorClass: 'danger' }
    ];

    recentActivities = [
        { type: 'user', message: 'انضم مستخدم جديد: أحمد محمد', time: 'منذ 5 دقائق' },
        { type: 'tournament', message: 'تم إنشاء بطولة جديدة: كأس رمضان 2024', time: 'منذ ساعة' },
        { type: 'match', message: 'انتهت مباراة: الصقور 3 - 1 النجوم', time: 'منذ ساعتين' },
        { type: 'objection', message: 'تم تقديم اعتراض جديد في مباراة #12', time: 'منذ 3 ساعات' }
    ];

    liveMatches = [
        { homeTeam: 'الصقور', awayTeam: 'النجوم', score: '3 - 1' },
        { homeTeam: 'الشعلة', awayTeam: 'الأمل', score: '0 - 0' }
    ];

    ngOnInit(): void { }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';

@Component({
    selector: 'app-team-detail',
    standalone: true,
    imports: [
        CommonModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent
    ],
    templateUrl: './team-detail.component.html',
    styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    activeTab = 'overview';

    team: any = {
        id: '1',
        name: 'نادي الصقور',
        city: 'الرياض',
        captainName: 'محمد أحمد علي',
        logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeRoWtZQChDLQJ4rIgwd3mvfJifNZ0W2G8GH2iH8cxlem1klxcPVUj3d_8jp_uHwriwPkhMKvEmuup2FJE05AGOZOCXGVasRDoBV_nkfbQ7N_c3xgwB6FF_03j7jAYx0NKZKUa3e5mC2NGZ1PyoM8m0119mHXhwTUKpdkYBkbmvbXxPT3OLfWDYjVvyFvd9Z1v_O1fbKZQz2vmEPALuSdCLIB1EuTpnWvYQKTTY0erZvKVqbuqNRxY5i_BCPW_3GwUy-k977OoD229',
        status: 'READY',
        isActive: true,
        createdAt: new Date('2023-11-01'),
        stats: {
            matches: 12,
            wins: 8,
            draws: 2,
            losses: 2,
            goalsFor: 28,
            goalsAgainst: 14,
            rank: 3
        },
        players: [
            { id: 1, name: 'أحمد سالم', number: 10, position: 'هجوم', goals: 12, yellowCards: 2, redCards: 0, status: 'active' },
            { id: 2, name: 'سلطان فهد', number: 1, position: 'حارس', goals: 0, yellowCards: 1, redCards: 0, status: 'active' },
            { id: 3, name: 'خالد محمد', number: 5, position: 'دفاع', goals: 2, yellowCards: 4, redCards: 1, status: 'suspended' },
            { id: 4, name: 'ياسر القحطاني', number: 9, position: 'هجوم', goals: 15, yellowCards: 1, redCards: 0, status: 'active' },
            { id: 5, name: 'محمد نور', number: 8, position: 'وسط', goals: 8, yellowCards: 3, redCards: 0, status: 'active' }
        ],
        matches: [
            { id: 1, opponent: 'نجم الشمال', date: new Date('2024-03-15T21:00:00'), score: '3-1', status: 'win', type: 'دوري المجموعات' },
            { id: 2, opponent: 'أسود الشرقية', date: new Date('2024-03-22T22:30:00'), score: '1-1', status: 'draw', type: 'دوري المجموعات' },
            { id: 3, opponent: 'برق الغربية', date: new Date('2024-03-29T21:00:00'), score: '0-2', status: 'loss', type: 'دوري المجموعات' }
        ],
        finances: [
            { id: 1, title: 'رسوم اشتراك - بطولة رمضان الكبرى', category: 'registration', amount: 1500, date: new Date('2024-01-10'), status: 'completed', type: 'expense' },
            { id: 2, title: 'رسوم اشتراك - دوري المحترفين الرمضاني', category: 'registration', amount: 1200, date: new Date('2024-02-15'), status: 'completed', type: 'expense' }
        ]
    };

    tabs = [
        { value: 'overview', label: 'نظرة عامة', icon: 'dashboard' },
        { value: 'players', label: 'قائمة اللاعبين', icon: 'groups' },
        { value: 'matches', label: 'المباريات', icon: 'sports_soccer' },
        { value: 'finances', label: 'المالية', icon: 'payments' }
    ];

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
    }

    navigateBack(): void {
        this.router.navigate(['/admin/teams']);
    }

    getPlayerStatusBadgeType(status: string): 'success' | 'warning' | 'danger' {
        switch (status) {
            case 'active': return 'success';
            case 'suspended': return 'warning';
            case 'banned': return 'danger';
            default: return 'success';
        }
    }

    getPlayerStatusLabel(status: string): string {
        switch (status) {
            case 'active': return 'نشط';
            case 'suspended': return 'موقوف';
            case 'banned': return 'محظور';
            default: return 'نشط';
        }
    }

    getMatchResultClass(status: string): string {
        return `match-result ${status}`;
    }

    requestPlayerAction(player: any, action: 'activate' | 'deactivate' | 'ban'): void {
        const config = {
            activate: { title: 'تفعيل اللاعب', message: `هل أنت متأكد من تفعيل اللاعب "${player.name}"؟ سيتمكن من المشاركة في المباريات القادمة.`, btn: 'تفعيل الآن', type: 'info' as const },
            deactivate: { title: 'تعطيل اللاعب', message: `هل أنت متأكد من تعطيل اللاعب "${player.name}"؟ لن يتمكن من المشاركة في المباريات حتى يتم إعادة تفعيله.`, btn: 'تعطيل اللاعب', type: 'danger' as const },
            ban: { title: 'حظر اللاعب نهائياً', message: `هل أنت متأكد من حظر اللاعب "${player.name}"؟ هذا الإجراء سيمنع اللاعب من المشاركة في البطولة نهائياً.`, btn: 'حظر نهائي', type: 'danger' as const }
        };

        const { title, message, btn, type } = config[action];

        this.uiFeedback.confirm(title, message, btn, type).subscribe((confirmed: boolean) => {
            if (confirmed) {
                if (action === 'activate') player.status = 'active';
                else if (action === 'deactivate') player.status = 'suspended';
                else if (action === 'ban') player.status = 'banned';

                this.uiFeedback.success('تم التحديث', 'تم تحديث حالة اللاعب بنجاح');
            }
        });
    }
}

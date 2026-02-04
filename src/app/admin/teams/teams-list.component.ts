import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';

type TeamFilterValue = 'all' | 'active' | 'inactive';

interface Team {
    id: string;
    name: string;
    city: string;
    captainName: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    isActive: boolean;
}

@Component({
    selector: 'app-teams-list',
    standalone: true,
    imports: [
        CommonModule,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent
    ],
    templateUrl: './teams-list.component.html',
    styleUrls: ['./teams-list.component.scss']
})
export class TeamsListComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    currentFilter: TeamFilterValue = 'all';
    isLoading = true;

    filters = [
        { value: 'all', label: 'الكل' },
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' }
    ];

    teams: Team[] = [];

    ngOnInit(): void {
        this.loadTeams();
    }

    loadTeams(): void {
        this.isLoading = true;
        // Simulate API call
        setTimeout(() => {
            this.teams = [
                {
                    id: 't1',
                    name: 'الصقور',
                    city: 'الرياض',
                    captainName: 'أحمد محمود',
                    playerCount: 8,
                    maxPlayers: 10,
                    status: 'READY',
                    isActive: true
                },
                {
                    id: 't2',
                    name: 'النجوم',
                    city: 'جدة',
                    captainName: 'سالم العمري',
                    playerCount: 6,
                    maxPlayers: 10,
                    status: 'INCOMPLETE',
                    isActive: false
                }
            ];
            this.isLoading = false;
        }, 500);
    }

    get filteredTeams(): Team[] {
        if (this.currentFilter === 'active') {
            return this.teams.filter(t => t.isActive);
        }
        if (this.currentFilter === 'inactive') {
            return this.teams.filter(t => !t.isActive);
        }
        return this.teams;
    }

    setFilter(filter: string): void {
        this.currentFilter = filter as TeamFilterValue;
    }

    requestToggleStatus(team: Team): void {
        const title = team.isActive ? 'تعطيل الفريق' : 'تفعيل الفريق';
        const message = team.isActive
            ? `هل أنت متأكد من رغبتك في تعطيل فريق "${team.name}"؟ لن يتمكن الفريق من تعديل بياناته أو اللعب مؤقتاً.`
            : `هل أنت متأكد من رغبتك في تفعيل فريق "${team.name}"؟ سيتمكن الفريق من المشاركة في البطولة فوراً.`;
        const confirmText = team.isActive ? 'تعطيل الفريق' : 'تفعيل الآن';

        this.uiFeedback.confirm(title, message, confirmText, team.isActive ? 'danger' : 'info').subscribe((confirmed: boolean) => {
            if (confirmed) {
                team.isActive = !team.isActive;
                this.uiFeedback.success('تم التحديث', `تم ${team.isActive ? 'تفعيل' : 'تعطيل'} الفريق بنجاح`);
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
                this.teams = this.teams.filter(t => t.id !== team.id);
                this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
            }
        });
    }

    viewTeam(team: Team): void {
        this.router.navigate(['/admin/teams', team.id]);
    }
}

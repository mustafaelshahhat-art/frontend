import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { TeamService } from '../../../core/services/team.service';
import { Team } from '../../../core/models/team.model';

type TeamFilterValue = 'all' | 'active' | 'inactive';

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
    private readonly teamService = inject(TeamService);
    private readonly cdr = inject(ChangeDetectorRef);

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
        this.teamService.getAllTeams().subscribe({
            next: (data) => {
                setTimeout(() => {
                    this.teams = data;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.teams = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    get filteredTeams(): Team[] {
        // TODO: Update property checks based on actual backend Team model
        let result = this.teams;
        if (this.currentFilter === 'active') {
            result = result.filter(t => (t as any).isActive);
        } else if (this.currentFilter === 'inactive') {
            result = result.filter(t => !(t as any).isActive);
        }
        return result;
    }

    setFilter(filter: string): void {
        this.currentFilter = filter as TeamFilterValue;
    }

    requestToggleStatus(team: Team): void {
        const isActive = (team as any).isActive;
        const title = isActive ? 'تعطيل الفريق' : 'تفعيل الفريق';
        const message = isActive
            ? `هل أنت متأكد من رغبتك في تعطيل فريق "${team.name}"؟ لن يتمكن الفريق من تعديل بياناته أو اللعب مؤقتاً.`
            : `هل أنت متأكد من رغبتك في تفعيل فريق "${team.name}"؟ سيتمكن الفريق من المشاركة في البطولة فوراً.`;
        const confirmText = isActive ? 'تعطيل الفريق' : 'تفعيل الآن';

        this.uiFeedback.confirm(title, message, confirmText, isActive ? 'danger' : 'info').subscribe((confirmed: boolean) => {
            if (confirmed) {
                // TODO: Implement backend toggle endpoint
                (team as any).isActive = !(team as any).isActive;
                this.uiFeedback.success('تم التحديث', `تم ${(team as any).isActive ? 'تفعيل' : 'تعطيل'} الفريق بنجاح`);
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
                // TODO: Implement backend delete endpoint
                this.teamService.deleteTeam(team.id, {} as any).subscribe({
                    next: () => {
                        this.teams = this.teams.filter(t => t.id !== team.id);
                        this.uiFeedback.success('تم الحذف', 'تم حذف الفريق بنجاح');
                    }
                });
            }
        });
    }

    viewTeam(team: Team): void {
        this.router.navigate(['/admin/teams', team.id]);
    }
}


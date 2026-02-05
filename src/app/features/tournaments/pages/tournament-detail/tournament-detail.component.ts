import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../../../core/services/tournament.service';
import { MatchService } from '../../../../core/services/match.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tournament, TournamentStatus, Match } from '../../../../core/models/tournament.model';
import { UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FilterComponent } from '../../../../shared/components/filter/filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MatchCardComponent } from '../../../../shared/components/match-card/match-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
    selector: 'app-tournament-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        FilterComponent,
        PageHeaderComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        MatchCardComponent,
        EmptyStateComponent
    ],
    templateUrl: './tournament-detail.component.html',
    styleUrls: ['./tournament-detail.component.scss']
})
export class TournamentDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private tournamentService = inject(TournamentService);
    private matchService = inject(MatchService);
    private authService = inject(AuthService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);

    tournament: Tournament | null = null;
    matches: Match[] = [];
    isLoading = true;

    TournamentStatus = TournamentStatus;

    // Tabs
    tabs = [
        { value: 'info', label: 'عن البطولة' },
        { value: 'standings', label: 'جدول الترتيب' },
        { value: 'matches', label: 'المباريات' },
        { value: 'teams', label: 'الفرق المشاركة' }
    ];
    activeTab = 'info';

    // Standings and Scorers (TODO: Implement backend endpoints)
    standings: any[] = [];
    scorers: any[] = [];

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadData(id);
        } else {
            this.navigateBack();
        }
    }

    // Role checks
    isAdmin(): boolean {
        return this.authService.hasRole(UserRole.ADMIN);
    }

    isCaptain(): boolean {
        return this.authService.hasRole(UserRole.CAPTAIN);
    }

    loadData(id: string): void {
        this.isLoading = true;
        this.tournamentService.getTournamentById(id).subscribe({
            next: (data) => {
                this.tournament = data || null;

                if (this.tournament) {
                    this.matchService.getMatchesByTournament(id).subscribe({
                        next: (matches) => {
                            this.matches = matches;
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        },
                        error: () => {
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        }
                    });
                } else {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            },
            error: () => {
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    navigateBack(): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/tournaments']);
        } else if (this.isCaptain()) {
            this.router.navigate(['/captain/championships']);
        }
    }

    getBackRoute(): string {
        if (this.isAdmin()) return '/admin/tournaments';
        if (this.isCaptain()) return '/captain/championships';
        return '/';
    }

    getStatusLabel(status: TournamentStatus | undefined): string {
        if (!status) return '';
        const labels: Record<TournamentStatus, string> = {
            [TournamentStatus.DRAFT]: 'مسودة',
            [TournamentStatus.REGISTRATION_OPEN]: 'التسجيل مفتوح',
            [TournamentStatus.REGISTRATION_CLOSED]: 'التسجيل مغلق',
            [TournamentStatus.ACTIVE]: 'جارية الآن',
            [TournamentStatus.COMPLETED]: 'منتهية',
            [TournamentStatus.CANCELLED]: 'ملغاة'
        };
        return labels[status];
    }

    getProgressPercent(): number {
        if (!this.tournament?.maxTeams) return 0;
        return (this.tournament.currentTeams / this.tournament.maxTeams) * 100;
    }

    // Registration Modal
    isRegisterModalVisible = false;
    isSubmitting = false;
    registerForm = {
        fromNumber: '',
        transferType: '',
        receipt: null as File | null
    };

    activeDropdown: string | null = null;

    toggleDropdown(name: string, event?: Event): void {
        event?.stopPropagation();
        this.activeDropdown = this.activeDropdown === name ? null : name;
    }

    selectTransferType(type: string): void {
        this.registerForm.transferType = type;
        this.activeDropdown = null;
    }

    // Modal Actions
    openRegisterModal(): void {
        this.isRegisterModalVisible = true;
    }

    closeRegisterModal(): void {
        this.isRegisterModalVisible = false;
        this.resetRegisterForm();
    }

    resetRegisterForm(): void {
        this.registerForm = {
            fromNumber: '',
            transferType: '',
            receipt: null
        };
        this.isSubmitting = false;
        this.activeDropdown = null;
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.registerForm.receipt = file;
        }
    }

    submitRegistration(): void {
        if (!this.registerForm.fromNumber || !this.registerForm.transferType || !this.registerForm.receipt) {
            this.uiFeedback.error('خطأ', 'يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }

        if (!this.tournament) return;

        this.isSubmitting = true;

        // TODO: Implement backend registration endpoint with file upload
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.teamId) {
            this.tournamentService.registerTeam(this.tournament.id, currentUser.teamId, 'placeholder-receipt-url').subscribe({
                next: () => {
                    this.isSubmitting = false;
                    this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل بنجاح');
                    this.closeRegisterModal();
                },
                error: (err: any) => {
                    this.isSubmitting = false;
                    this.uiFeedback.error('خطأ', err.message || 'فشل تقديم طلب التسجيل');
                }
            });
        }
    }

    // Admin actions
    editTournament(): void {
        if (this.tournament) {
            this.router.navigate(['/admin/tournaments/edit', this.tournament.id]);
        }
    }

    toggleStatus(): void {
        if (!this.tournament) return;
        // Toggle status
        const newStatus = this.tournament.status === TournamentStatus.REGISTRATION_OPEN
            ? TournamentStatus.REGISTRATION_CLOSED
            : TournamentStatus.REGISTRATION_OPEN;

        // TODO: Implement backend status update
        this.tournament.status = newStatus;
        this.uiFeedback.success('تم التحديث', `تم تغيير حالة البطولة إلى: ${this.getStatusLabel(newStatus)}`);
    }

    // Captain actions
    registerTeam(): void {
        if (this.tournament) {
            this.openRegisterModal();
        }
    }

    // Navigation
    viewMatch(matchId: string): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/matches', matchId]);
        } else if (this.isCaptain()) {
            this.router.navigate(['/captain/matches', matchId]);
        }
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        this.activeDropdown = null;
    }

}


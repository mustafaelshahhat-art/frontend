import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, computed, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutOrchestratorService } from '../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../../shared/components/filter/filter.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../../shared/components/inline-loading/inline-loading.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { Tournament, TeamRegistration, RegistrationStatus } from '../../../core/models/tournament.model';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { TournamentStore } from '../../../core/stores/tournament.store';

@Component({
    selector: 'app-payment-requests',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FilterComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        TableComponent
    ],
    templateUrl: './payment-requests.component.html',
    styleUrls: ['./payment-requests.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentRequestsComponent implements OnInit, AfterViewInit, OnDestroy {
    RegistrationStatus = RegistrationStatus;
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly tournamentService = inject(TournamentService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly tournamentStore = inject(TournamentStore);
    private readonly layout = inject(LayoutOrchestratorService);
    private readonly authService = inject(AuthService);

    currentFilter = signal<string>('all');
    showReceiptModal = false;
    selectedRequest: { tournament: Tournament, registration: TeamRegistration } | null = null;


    // ✅ FIXED: Using direct source from store or local state
    // We'll keep the store as source for SignalR reactivity, 
    // but the initial load will now use the correct endpoint.
    requests = computed(() => {
        const tournaments = this.tournamentStore.tournaments();
        const result: { tournament: Tournament, registration: TeamRegistration }[] = [];

        tournaments.forEach(tournament => {
            if (tournament.registrations) {
                tournament.registrations.forEach(reg => {
                    // Include all relevant statuses for the management view
                    if (reg.status === RegistrationStatus.PENDING_PAYMENT_REVIEW ||
                        reg.status === RegistrationStatus.APPROVED ||
                        reg.status === RegistrationStatus.REJECTED) {
                        result.push({ tournament, registration: reg });
                    }
                });
            }
        });

        return result;
    });

    isLoading = this.tournamentStore.isLoading;
    filters = [
        { value: 'all', label: 'الكل' },
        { value: RegistrationStatus.PENDING_PAYMENT_REVIEW, label: 'معلق' },
        { value: RegistrationStatus.APPROVED, label: 'مقبول' },
        { value: RegistrationStatus.REJECTED, label: 'مرفوض' }
    ];

    // ✅ FIXED: Compute filtered requests to ensure local reactivity
    filteredRequests = computed(() => {
        const allRequests = this.requests();
        const filter = this.currentFilter();
        if (filter === 'all') return allRequests;
        return allRequests.filter(r => r.registration.status === filter);
    });

    columns: TableColumn[] = [];

    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;
    @ViewChild('teamInfo') teamInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('amountInfo') amountInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('dateInfo') dateInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('senderNumberInfo') senderNumberInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('receiptInfo') receiptInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<{ tournament: Tournament, registration: TeamRegistration }>;

    ngOnInit(): void {
        this.layout.setTitle('طلبات الدفع');
        this.layout.setSubtitle('مراجعة واعتماد إيصالات الدفع للفرق المشاركة');
        this.loadInitialData();
        // ✅ FIXED: No real-time setup needed - TournamentStore auto-updates via SignalR
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'team', label: 'الفريق', template: this.teamInfo },
            { key: 'amount', label: 'المبلغ', template: this.amountInfo },
            { key: 'date', label: 'التاريخ', template: this.dateInfo },
            { key: 'senderNumber', label: 'الرقم المحول منه', template: this.senderNumberInfo },
            { key: 'status', label: 'الحالة', template: this.statusInfo },
            { key: 'receipt', label: 'الإيصال', template: this.receiptInfo },
            { key: 'action', label: 'الإجراء', template: this.actionInfo }
        ];

        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            this.layout.setFilters(this.filtersTemplate);
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.layout.reset();
    }

    // ✅ FIXED: Use getAllPaymentRequests to get FULL registration data including Rejected ones
    private loadInitialData(): void {
        this.tournamentStore.setLoading(true);
        this.tournamentService.getAllPaymentRequests().subscribe({
            next: (data) => {
                // Mapping flat responses back to Tournament objects for the store
                const tournamentMap = new Map<string, Tournament>();
                data.forEach(req => {
                    const existing = tournamentMap.get(req.tournament.id);
                    if (existing) {
                        existing.registrations = [...(existing.registrations || []), req.registration];
                    } else {
                        const tournament = { ...req.tournament, registrations: [req.registration] };
                        tournamentMap.set(tournament.id, tournament);
                    }
                });
                this.tournamentStore.setTournaments(Array.from(tournamentMap.values()));
            },
            error: (err) => {
                console.error('Error loading payment requests:', err);
                this.tournamentStore.setLoading(false);
            }
        });
    }


    canManageRequest(tournament: Tournament): boolean {
        const user = this.authService.getCurrentUser();
        if (!user || !tournament) return false;
        return tournament.adminId === user.id || tournament.creatorUserId === user.id;
    }

    approve(request: { tournament: Tournament, registration: TeamRegistration }): void {
        this.tournamentService.approvePayment(request.tournament.id, request.registration.teamId).subscribe({
            next: () => {
                this.uiFeedback.success('تم بنجاح', `تم قبول طلب الدفع لفريق ${request.registration.teamName}`);
            }
        });
    }

    reject(request: { tournament: Tournament, registration: TeamRegistration }): void {
        this.uiFeedback.confirm('رفض الطلب', 'يرجى تأكيد رفض طلب الدفع', 'رفض', 'danger').subscribe(confirmed => {
            if (confirmed) {
                this.tournamentService.rejectPayment(request.tournament.id, request.registration.teamId, 'Rejected by admin').subscribe({
                    next: () => {
                        this.uiFeedback.error('تم الرفض', `تم رفض طلب الدفع لفريق ${request.registration.teamName}`);
                    }
                });
            }
        });
    }

    viewReceipt(request: { tournament: Tournament, registration: TeamRegistration }): void {
        this.selectedRequest = request;
        this.showReceiptModal = true;
    }

    closeReceipt(): void {
        this.showReceiptModal = false;
        this.selectedRequest = null;
    }

    setFilter(filter: unknown): void {
        this.currentFilter.set(filter as string);
    }

    getBadgeType(status: RegistrationStatus): 'warning' | 'success' | 'danger' {
        switch (status) {
            case RegistrationStatus.PENDING_PAYMENT_REVIEW: return 'warning';
            case RegistrationStatus.APPROVED: return 'success';
            case RegistrationStatus.REJECTED: return 'danger';
            default: return 'warning';
        }
    }

    getStatusLabel(status: RegistrationStatus): string {
        switch (status) {
            case RegistrationStatus.PENDING_PAYMENT_REVIEW: return 'معلق';
            case RegistrationStatus.APPROVED: return 'مقبول';
            case RegistrationStatus.REJECTED: return 'مرفوض';
            default: return status;
        }
    }
}

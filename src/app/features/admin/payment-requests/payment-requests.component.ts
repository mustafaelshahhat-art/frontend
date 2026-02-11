import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { AdminLayoutService } from '../../../core/services/admin-layout.service';
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
    private readonly adminLayout = inject(AdminLayoutService);

    currentFilter = 'all';
    showReceiptModal = false;
    selectedRequest: { tournament: Tournament, registration: TeamRegistration } | null = null;


    // ✅ FIXED: Compute requests from TournamentStore instead of local state
    requests = computed(() => {
        const tournaments = this.tournamentStore.tournaments();
        const result: { tournament: Tournament, registration: TeamRegistration }[] = [];

        tournaments.forEach(tournament => {
            if (tournament.registrations) {
                tournament.registrations.forEach(reg => {
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
        { value: RegistrationStatus.APPROVED, label: 'مقبول' }
    ];

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
        this.adminLayout.setTitle('طلبات الدفع');
        this.adminLayout.setSubtitle('مراجعة واعتماد إيصالات الدفع للفرق المشاركة');
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
            this.adminLayout.setFilters(this.filtersTemplate);
        });

        this.cdr.detectChanges();
    }

    ngOnDestroy(): void {
        this.adminLayout.reset();
    }

    // ✅ FIXED: Load tournaments ONCE on init to populate store
    private loadInitialData(): void {
        this.tournamentStore.setLoading(true);
        this.tournamentService.getTournaments().subscribe({
            next: (data) => {
                this.tournamentStore.setTournaments(data);
            },
            error: () => {
                this.tournamentStore.setLoading(false);
            }
        });
    }

    get filteredRequests(): { tournament: Tournament, registration: TeamRegistration }[] {
        const allRequests = this.requests();
        if (this.currentFilter === 'all') return allRequests;
        return allRequests.filter(r => r.registration.status === this.currentFilter);
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
        this.currentFilter = filter as string;
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

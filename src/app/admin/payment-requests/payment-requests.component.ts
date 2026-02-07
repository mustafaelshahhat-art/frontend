import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament, TeamRegistration, RegistrationStatus } from '../../core/models/tournament.model';
import { TableComponent, TableColumn } from '../../shared/components/table/table.component';

@Component({
    selector: 'app-payment-requests',
    standalone: true,
    imports: [
        CommonModule,
        FilterComponent,
        PageHeaderComponent,
        ButtonComponent,
        BadgeComponent,
        EmptyStateComponent,
        InlineLoadingComponent,
        TableComponent
    ],
    templateUrl: './payment-requests.component.html',
    styleUrls: ['./payment-requests.component.scss']
})
export class PaymentRequestsComponent implements OnInit, AfterViewInit {
    RegistrationStatus = RegistrationStatus;
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly tournamentService = inject(TournamentService);
    private readonly cdr = inject(ChangeDetectorRef);

    currentFilter = 'all';
    isLoading = true;
    showReceiptModal = false;
    selectedRequest: { tournament: Tournament, registration: TeamRegistration } | null = null;

    filters = [
        { value: 'all', label: 'الكل' },
        { value: RegistrationStatus.PENDING_PAYMENT_REVIEW, label: 'معلق' },
        { value: RegistrationStatus.APPROVED, label: 'مقبول' }
    ];

    requests: { tournament: Tournament, registration: TeamRegistration }[] = [];
    columns: TableColumn[] = [];

    @ViewChild('teamInfo') teamInfo!: TemplateRef<any>;
    @ViewChild('amountInfo') amountInfo!: TemplateRef<any>;
    @ViewChild('dateInfo') dateInfo!: TemplateRef<any>;
    @ViewChild('statusInfo') statusInfo!: TemplateRef<any>;
    @ViewChild('receiptInfo') receiptInfo!: TemplateRef<any>;
    @ViewChild('actionInfo') actionInfo!: TemplateRef<any>;

    ngOnInit(): void {
        this.loadRequests();
    }

    ngAfterViewInit(): void {
        this.columns = [
            { key: 'team', label: 'الفريق', template: this.teamInfo },
            { key: 'amount', label: 'المبلغ', template: this.amountInfo },
            { key: 'date', label: 'التاريخ', template: this.dateInfo },
            { key: 'status', label: 'الحالة', template: this.statusInfo },
            { key: 'receipt', label: 'الإيصال', template: this.receiptInfo },
            { key: 'action', label: 'الإجراء', template: this.actionInfo }
        ];
        this.cdr.detectChanges();
    }

    loadRequests(): void {
        this.isLoading = true;
        this.tournamentService.getPendingPaymentApprovals().subscribe({
            next: (data) => {
                setTimeout(() => {
                    this.requests = data;
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                setTimeout(() => {
                    this.requests = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    get filteredRequests(): { tournament: Tournament, registration: TeamRegistration }[] {
        if (this.currentFilter === 'all') return this.requests;
        return this.requests.filter(r => r.registration.status === this.currentFilter);
    }

    approve(request: { tournament: Tournament, registration: TeamRegistration }): void {
        this.tournamentService.approvePayment(request.tournament.id, request.registration.teamId, 'admin').subscribe({
            next: () => {
                request.registration.status = RegistrationStatus.APPROVED;
                this.uiFeedback.success('تم بنجاح', `تم قبول طلب الدفع لفريق ${request.registration.teamName}`);
            }
        });
    }

    reject(request: { tournament: Tournament, registration: TeamRegistration }): void {
        this.uiFeedback.confirm('رفض الطلب', 'يرجى تأكيد رفض طلب الدفع', 'رفض', 'danger').subscribe(confirmed => {
            if (confirmed) {
                this.tournamentService.rejectPayment(request.tournament.id, request.registration.teamId, 'admin', 'Rejected by admin').subscribe({
                    next: () => {
                        request.registration.status = RegistrationStatus.REJECTED;
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

    setFilter(filter: string): void {
        this.currentFilter = filter;
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


import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { FilterComponent } from '../../shared/components/filter/filter.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { InlineLoadingComponent } from '../../shared/components/inline-loading/inline-loading.component';

type PaymentStatus = 'pending' | 'approved' | 'rejected';

interface PaymentRequest {
    id: number;
    teamName: string;
    amount: number;
    date: Date;
    status: PaymentStatus;
    receiptUrl?: string;
}

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
        InlineLoadingComponent
    ],
    templateUrl: './payment-requests.component.html',
    styleUrls: ['./payment-requests.component.scss']
})
export class PaymentRequestsComponent implements OnInit {
    private readonly uiFeedback = inject(UIFeedbackService);

    currentFilter = 'all';
    isLoading = true;
    showReceiptModal = false;
    selectedRequest: PaymentRequest | null = null;

    filters = [
        { value: 'all', label: 'الكل' },
        { value: 'pending', label: 'معلق' },
        { value: 'approved', label: 'مقبول' }
    ];

    requests: PaymentRequest[] = [];

    ngOnInit(): void {
        this.loadRequests();
    }

    loadRequests(): void {
        this.isLoading = true;
        // Simulate API call
        setTimeout(() => {
            this.requests = [
                { id: 1, teamName: 'صقور العاصمة', amount: 1500, date: new Date('2024-03-01'), status: 'pending', receiptUrl: 'https://images.sampletemplates.com/wp-content/uploads/2016/03/Official-Receipt-Template.jpg' },
                { id: 2, teamName: 'النجوم السوداء', amount: 1500, date: new Date('2024-03-02'), status: 'pending', receiptUrl: 'https://images.sampletemplates.com/wp-content/uploads/2016/03/Official-Receipt-Template.jpg' },
                { id: 3, teamName: 'البرق', amount: 1500, date: new Date('2024-02-28'), status: 'approved', receiptUrl: 'https://images.sampletemplates.com/wp-content/uploads/2016/03/Official-Receipt-Template.jpg' },
                { id: 4, teamName: 'الصحراء', amount: 1500, date: new Date('2024-02-27'), status: 'rejected', receiptUrl: 'https://images.sampletemplates.com/wp-content/uploads/2016/03/Official-Receipt-Template.jpg' }
            ];
            this.isLoading = false;
        }, 500);
    }

    get filteredRequests(): PaymentRequest[] {
        if (this.currentFilter === 'all') return this.requests;
        return this.requests.filter(r => r.status === this.currentFilter);
    }

    approve(request: PaymentRequest): void {
        request.status = 'approved';
        this.uiFeedback.success('تم بنجاح', `تم قبول طلب الدفع لفريق ${request.teamName}`);
    }

    reject(request: PaymentRequest): void {
        request.status = 'rejected';
        this.uiFeedback.error('تم الرفض', `تم رفض طلب الدفع لفريق ${request.teamName}`);
    }

    viewReceipt(request: PaymentRequest): void {
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

    getBadgeType(status: PaymentStatus): 'warning' | 'success' | 'danger' {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'danger';
        }
    }

    getStatusLabel(status: PaymentStatus): string {
        switch (status) {
            case 'pending': return 'معلق';
            case 'approved': return 'مقبول';
            case 'rejected': return 'مرفوض';
        }
    }
}

import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectionStrategy, computed, ViewChild, TemplateRef, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationStore } from '../../../../core/stores/notification.store';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { Notification as AppNotification } from '../../../../core/models/tournament.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { FilterComponent, FilterItem } from '../../../../shared/components/filter/filter.component';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { createClientPagination, PaginationSource } from '../../../../shared/data-access/paginated-data-source';

interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    type: string;
    isRead: boolean;
    icon?: string;
    link?: string;
}

type NotificationFilterValue = 'all' | 'unread' | 'read';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        EmptyStateComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        InlineLoadingComponent,
        TimeAgoPipe,
        FilterComponent,
        PaginationComponent
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit, AfterViewInit, OnDestroy {
    private authService = inject(AuthService);
    private permissionsService = inject(PermissionsService);
    private notificationService = inject(NotificationService);
    private notificationStore = inject(NotificationStore);
    private router = inject(Router);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);

    currentUser = this.authService.getCurrentUser();

    isLoading = this.notificationStore.isLoading;

    // Filter State
    selectedFilter = signal<NotificationFilterValue>('all');
    @ViewChild('filtersTemplate') filtersTemplate!: TemplateRef<unknown>;

    readonly filters: FilterItem[] = [
        { label: 'الكل', value: 'all', icon: 'all_inclusive' },
        { label: 'غير مقروءة', value: 'unread', icon: 'mark_email_unread' },
        { label: 'مقروءة', value: 'read', icon: 'drafts' }
    ];

    notificationsView = computed(() => {
        let currentNotifications = this.notificationStore.notifications();

        // Apply Filter based on signal
        const filter = this.selectedFilter();
        if (filter === 'unread') {
            currentNotifications = currentNotifications.filter(n => !n.isRead);
        } else if (filter === 'read') {
            currentNotifications = currentNotifications.filter(n => n.isRead);
        }

        return currentNotifications.map((n: AppNotification) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdAt: new Date(n.createdAt),
            type: n.type,
            isRead: n.isRead,
            icon: this.getIcon(n.type)
        }));
    });

    get notifications(): Notification[] {
        return this.notificationsView();
    }

    // Pagination — slices notificationsView client-side
    pager: PaginationSource<Notification> = createClientPagination(this.notificationsView, { pageSize: 20 });

    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;

    ngOnInit(): void {
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);
        this.notificationService.loadNotifications();
    }

    ngAfterViewInit(): void {
        // Defer to avoid ExpressionChangedAfterItHasCheckedError
        queueMicrotask(() => {
            if (this.actionsTemplate) this.layoutOrchestrator.setActions(this.actionsTemplate);
            if (this.filtersTemplate) this.layoutOrchestrator.setFilters(this.filtersTemplate);
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    get pageTitle(): string {
        return this.permissionsService.has(Permission.VIEW_ADMIN_DASHBOARD) ? 'التنبيهات' : 'مركز التنبيهات';
    }

    get pageSubtitle(): string {
        if (this.permissionsService.has(Permission.VIEW_ADMIN_DASHBOARD)) {
            return 'إدارة جميع تنبيهات النظام والمستجدات';
        }
        if (this.permissionsService.has(Permission.START_MATCH)) {
            return 'ابق على اطلاع بآخر التحديثات والمواعيد الخاصة بك';
        }
        return 'تابع آخر أخبار فريقك ونتائج البطولة لحظة بلحظة';
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    markAsRead(notification: Notification): void {
        this.notificationService.markAsRead(notification.id).subscribe();

        if (notification.link) {
            this.router.navigateByUrl(notification.link);
        }
    }

    setFilter(filter: unknown): void {
        this.selectedFilter.set(filter as NotificationFilterValue);
        this.pager.loadPage(1);
    }

    getIcon(type: string): string {
        const icons: Record<string, string> = {
            'match': 'sports_soccer',
            'tournament': 'emoji_events',

            'message': 'mail',
            'team': 'groups',
            'system': 'settings',
            'payment': 'payments'
        };
        return icons[type] || 'notifications';
    }

    getColor(type: string): string {
        const colors: Record<string, string> = {
            'match': '#3B82F6',
            'tournament': '#10B981',

            'message': '#3B82F6',
            'team': '#8B5CF6',
            'system': '#64748b',
            'payment': '#F59E0B'
        };
        return colors[type] || '#64748b';
    }


    get unreadCount(): number {
        // This should probably count total unread from store, but for now filtering viewed notifications
        // A better approach is to filter the store notifications directly for unread count
        return this.notificationStore.notifications().filter(n => !n.isRead).length;
    }

    trackByNotification(_index: number, item: Notification): string {
        return item.id;
    }
}

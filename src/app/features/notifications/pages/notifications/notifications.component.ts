import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectionStrategy, ViewChild, TemplateRef, AfterViewInit, OnDestroy, computed } from '@angular/core';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { Router } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { Notification, NotificationCategory, NotificationType } from '../../../../core/models/tournament.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { InlineLoadingComponent } from '../../../../shared/components/inline-loading/inline-loading.component';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Permission } from '../../../../core/permissions/permissions.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        IconComponent,
        EmptyStateComponent,
        CardComponent,
        ButtonComponent,
        BadgeComponent,
        InlineLoadingComponent,
        TimeAgoPipe,
        PaginationComponent
    ],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly permissionsService = inject(PermissionsService);
    private readonly notificationService = inject(NotificationService);
    private readonly router = inject(Router);
    private readonly layoutOrchestrator = inject(LayoutOrchestratorService);

    // -- Store signals (read-only) --
    readonly notifications = this.notificationService.notifications;
    readonly isLoading = this.notificationService.isLoading;
    readonly unreadCount = this.notificationService.unreadCount;
    readonly totalPages = this.notificationService.totalPages;
    readonly currentPage = this.notificationService.currentPage;
    readonly hasNextPage = this.notificationService.hasNextPage;
    readonly hasPreviousPage = this.notificationService.hasPreviousPage;
    readonly isEmpty = this.notificationService.isEmpty;

    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<unknown>;

    /** Page summary like "صفحة 1 من 5" */
    readonly summary = computed(() => {
        const page = this.currentPage();
        const total = this.totalPages();
        if (total === 0) return '';
        return `صفحة ${page} من ${total}`;
    });

    // -- Lifecycle --

    ngOnInit(): void {
        this.layoutOrchestrator.setTitle(this.pageTitle);
        this.layoutOrchestrator.setSubtitle(this.pageSubtitle);
    }

    ngAfterViewInit(): void {
        queueMicrotask(() => {
            if (this.actionsTemplate) this.layoutOrchestrator.setActions(this.actionsTemplate);
        });
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    // -- Page info --

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

    // -- Actions --

    markAllAsRead(): void {
        firstValueFrom(this.notificationService.markAllAsRead()).catch(() => {});
    }

    markAsRead(notification: Notification): void {
        if (!notification.isRead) {
            firstValueFrom(this.notificationService.markAsRead(notification.id)).catch(() => {});
        }
        if (notification.actionUrl) {
            this.router.navigateByUrl(notification.actionUrl);
        }
    }

    deleteNotification(event: MouseEvent, notification: Notification): void {
        event.stopPropagation();
        firstValueFrom(this.notificationService.deleteNotification(notification.id)).catch(() => {});
    }

    // -- Pagination --

    loadPage(page: number): void {
        this.notificationService.loadPage(page);
    }

    // -- Helpers --

    getCategoryIcon(category: NotificationCategory): string {
        const icons: Record<NotificationCategory, string> = {
            system: 'settings',
            account: 'person',
            payments: 'payments',
            tournament: 'emoji_events',
            match: 'sports_soccer',
            team: 'groups',
            administrative: 'admin_panel_settings',
            security: 'security'
        };
        return icons[category] || 'notifications';
    }

    getTypeClass(type: NotificationType): string {
        const classes: Record<NotificationType, string> = {
            info: 'type-info',
            success: 'type-success',
            warning: 'type-warning',
            error: 'type-error'
        };
        return classes[type] || 'type-info';
    }

    getPriorityLabel(priority: string): string | null {
        switch (priority) {
            case 'high': return 'مهم';
            case 'urgent': return 'عاجل';
            default: return null;
        }
    }
}
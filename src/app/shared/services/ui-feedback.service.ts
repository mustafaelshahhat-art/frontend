import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// ==========================================================================
// GLOBAL UI FEEDBACK SERVICE
// Unified system for all UI feedback across the application
// ==========================================================================

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
    id: number;
    type: FeedbackType;
    title: string;
    message?: string;
    dismissible?: boolean;
    duration?: number;
}

export interface ConfirmDialogConfig {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    icon?: string;
}

export interface LoadingState {
    isLoading: boolean;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class UIFeedbackService {
    // ========================================
    // ALERTS
    // ========================================
    private _alerts = signal<Alert[]>([]);
    readonly alerts = this._alerts.asReadonly();
    private alertId = 0;

    showAlert(type: FeedbackType, title: string, message?: string, duration: number = 5000): number {
        const id = ++this.alertId;
        const alert: Alert = { id, type, title, message, dismissible: true, duration };
        this._alerts.update(a => [...a, alert]);

        if (duration > 0) {
            setTimeout(() => this.dismissAlert(id), duration);
        }
        return id;
    }

    dismissAlert(id: number): void {
        this._alerts.update(a => a.filter(alert => alert.id !== id));
    }

    clearAlerts(): void {
        this._alerts.set([]);
    }

    private _confirmDialog = signal<ConfirmDialogConfig | null>(null);
    private _confirmSubject = new Subject<boolean>();
    readonly confirmDialog = this._confirmDialog.asReadonly();

    /**
     * Shows a confirmation dialog.
     * Can be called with a config object or positional arguments.
     */
    confirm(
        configOrTitle: ConfirmDialogConfig | string,
        message?: string,
        confirmText?: string,
        type?: 'danger' | 'warning' | 'info',
        cancelText?: string,
        icon?: string
    ): Observable<boolean> {
        let config: ConfirmDialogConfig;

        if (typeof configOrTitle === 'string') {
            config = {
                title: configOrTitle,
                message: message || '',
                confirmText: confirmText || 'تأكيد',
                cancelText: cancelText || 'إلغاء',
                type: type || 'danger',
                icon: icon || (type === 'info' ? 'info' : 'warning')
            };
        } else {
            config = {
                confirmText: 'تأكيد',
                cancelText: 'إلغاء',
                type: 'danger',
                icon: 'warning',
                ...configOrTitle
            };
        }

        this._confirmDialog.set(config);
        this._confirmSubject = new Subject<boolean>();
        return this._confirmSubject.asObservable();
    }

    resolveConfirm(result: boolean): void {
        this._confirmSubject.next(result);
        this._confirmSubject.complete();
        this._confirmDialog.set(null);
    }

    // ========================================
    // LOADING STATE
    // ========================================
    private _loading = signal<LoadingState>({ isLoading: false });
    readonly loading = this._loading.asReadonly();
    readonly isLoading = computed(() => this._loading().isLoading);

    showLoading(message?: string): void {
        this._loading.set({ isLoading: true, message });
    }

    hideLoading(): void {
        this._loading.set({ isLoading: false });
    }

    // ========================================
    // HELPER METHODS
    // ========================================
    success(title: string, message?: string, duration?: number): number {
        return this.showAlert('success', title, message, duration);
    }

    error(title: string, message?: string, duration?: number): number {
        return this.showAlert('error', title, message, duration);
    }

    warning(title: string, message?: string, duration?: number): number {
        return this.showAlert('warning', title, message, duration);
    }

    info(title: string, message?: string, duration?: number): number {
        return this.showAlert('info', title, message, duration);
    }
}

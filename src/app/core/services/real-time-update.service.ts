import { Injectable, inject } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from './auth.service';

export interface SystemEvent {
    type: string;
    metadata: any;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class RealTimeUpdateService {
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly authService = inject(AuthService);

    private events$ = new Subject<SystemEvent>();
    public systemEvents$ = this.events$.asObservable();

    // Registry for components to report their editing state
    private editingState = new BehaviorSubject<boolean>(false);
    public isEditing$ = this.editingState.asObservable();

    private pendingUpdates: SystemEvent[] = [];

    /**
     * Set the editing state of the current view.
     * When isEditing is true, real-time updates are queued instead of applied.
     */
    setEditingState(isEditing: boolean): void {
        const wasEditing = this.editingState.value;
        this.editingState.next(isEditing);

        // Auto-apply updates as soon as the user stops editing
        if (wasEditing && !isEditing && this.pendingUpdates.length > 0) {
            this.applyPendingUpdates();
        }
    }

    /**
     * Dispatch a system event received from SignalR.
     */
    dispatch(event: any): void {
        const systemEvent: SystemEvent = {
            type: event.type || event.Type,
            metadata: event.metadata || event.Metadata,
            timestamp: new Date(event.timestamp || event.Timestamp || Date.now())
        };

        console.log('RealTimeUpdate: Received event', systemEvent);

        // 1. Check for force actions (Logout / Critical Reloads)
        if (this.handleCriticalActions(systemEvent)) {
            return;
        }

        // 2. Check editing state
        if (this.editingState.value) {
            // Queue updates to prevent UI jumping while user is typing/editing
            this.pendingUpdates.push(systemEvent);
        } else {
            // 3. Dispatch to subscribers immediately if not editing
            this.events$.next(systemEvent);
        }
    }

    private handleCriticalActions(event: SystemEvent): boolean {
        // Force Logout if User Bloacked
        if (event.type === 'USER_BLOCKED') {
            const currentUser = this.authService.getCurrentUser();
            if (currentUser && event.metadata.UserId === currentUser.id) {
                this.uiFeedback.error('تم حظر الحساب', 'تم حظر حسابك من قبل الإدارة، سيتم تسجيل الخروج الآن');
                setTimeout(() => {
                    this.authService.logout();
                }, 3000);
                return true;
            }
        }

        // Force Auth Refresh if User Approved
        if (event.type === 'USER_APPROVED') {
            const currentUser = this.authService.getCurrentUser();
            if (currentUser && event.metadata.UserId === currentUser.id) {
                this.uiFeedback.success('تم تفعيل حسابك!', 'مبروك، تم تفعيل حسابك بنجاح. سنقوم بتحديث الصفحة الآن');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                return true;
            }
        }

        return false;
    }

    applyPendingUpdates(): void {
        const updates = [...this.pendingUpdates];
        this.pendingUpdates = [];

        if (updates.length > 0) {
            console.log(`RealTimeUpdate: Automatically applying ${updates.length} pending updates.`);
            updates.forEach(ev => this.events$.next(ev));

            // Subtle feedback that data was updated if helpful, or keep it silent
            // this.uiFeedback.toast('تم تحديث البيانات تلقائياً');
        }
    }

    /**
     * Helper to subscribe to specific event types
     */
    on(type: string | string[]): Observable<SystemEvent> {
        const types = Array.isArray(type) ? type : [type];
        return this.systemEvents$.pipe(
            filter(event => types.includes(event.type))
        );
    }
}

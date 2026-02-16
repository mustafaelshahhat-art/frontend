import { Component, OnInit, ViewChild, ElementRef, inject, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserRole, TeamRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatBoxComponent } from '../../../../features/chat/components/chat-box/chat-box.component';
import { ChatService } from '../../../../core/services/chat.service';
import { MatchService } from '../../../../core/services/match.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Match, MatchStatus } from '../../../../core/models/tournament.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';

export enum ChatParticipantRole {
    CAPTAIN = 'captain',
    PLAYER = 'player',
    ADMIN = 'admin'
}

interface ChatMessage {
    id: string;
    text: string;
    senderName: string;
    senderId: string;
    senderRole: string;
    timestamp: Date;
    isSystem?: boolean;
}

interface ChatParticipant {
    id: string;
    name: string;
    avatarInitial: string;
    role: ChatParticipantRole;
    teamId?: string;
    isOnline: boolean;
}

@Component({
    selector: 'app-match-chat',
    standalone: true,
    imports: [CommonModule, ChatBoxComponent, ButtonComponent, ModalComponent, FormControlComponent, FormsModule],
    templateUrl: './match-chat.component.html',
    styleUrls: ['./match-chat.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchChatComponent implements OnInit, OnDestroy {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private uiFeedback = inject(UIFeedbackService);
    private chatService = inject(ChatService);
    private matchService = inject(MatchService);
    private notificationService = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef);
    private navService = inject(ContextNavigationService);
    private permissionsService = inject(PermissionsService);
    private destroyRef = inject(DestroyRef);

    ChatParticipantRole = ChatParticipantRole;

    newMessage = '';
    showParticipants = true;
    currentUser: User | null = null;
    isAuthorized = false;
    isLoading = true;
    matchId = '';

    match: Match | null = null;
    participants: ChatParticipant[] = [];
    realTimeMessages = toSignal(this.chatService.messages, { initialValue: [] });

    // Schedule modal
    showScheduleModal = false;
    scheduleDate = '';
    scheduleTime = '';
    isSavingSchedule = false;

    ngOnInit(): void {
        this.matchId = this.route.snapshot.paramMap.get('id') || '';
        this.currentUser = this.authService.getCurrentUser();

        // Load match data and check authorization
        this.loadMatchData();

        // Subscription to this specific match updates
        this.notificationService.subscribeToMatch(this.matchId);
    }

    ngOnDestroy(): void {
        if (this.matchId) {
            this.chatService.leaveMatch();
        }
    }

    private loadMatchData(): void {
        this.isLoading = true;
        this.matchService.getMatchById(this.matchId).subscribe({
            next: (match) => {
                this.match = match ?? null;
                if (this.match) {
                    this.checkAuthorization();
                    if (this.isAuthorized) {
                        this.chatService.joinMatch(this.matchId).catch(err => {
                            console.error('SignalR Join Error:', err);
                        });
                        this.loadParticipants();

                        // PERF-FIX F3: SignalR Match Updates — takeUntilDestroyed prevents memory leak
                        this.matchService.matchUpdated$.pipe(
                            takeUntilDestroyed(this.destroyRef)
                        ).subscribe(updatedMatch => {
                            if (updatedMatch && updatedMatch.id === this.matchId) {
                                this.match = updatedMatch;
                                this.cdr.detectChanges();
                            }
                        });
                    }
                }
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Load Match Error:', err);
                this.uiFeedback.error('فشل التحميل', 'تعذّر تحميل بيانات المباراة. يرجى تحديث الصفحة.');
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private checkAuthorization(): void {
        if (!this.currentUser || !this.match) {
            this.isAuthorized = false;
            return;
        }

        const userRole = this.currentUser.role;

        // Admin can access all chats
        if (userRole === UserRole.ADMIN) {
            this.isAuthorized = true;
            return;
        }

        // Captain or Player of one of the teams participating in the match
        const isHomePlayer = this.currentUser.teamId === this.match.homeTeamId || (this.currentUser.joinedTeamIds?.includes(this.match.homeTeamId));
        const isAwayPlayer = this.currentUser.teamId === this.match.awayTeamId || (this.currentUser.joinedTeamIds?.includes(this.match.awayTeamId));
        const isCreator = this.currentUser.id === this.match.tournamentCreatorId;

        if (isHomePlayer || isAwayPlayer || isCreator) {
            this.isAuthorized = true;
            return;
        }

        this.isAuthorized = false;
    }

    private loadParticipants(): void {
        if (!this.match) return;

        // Populate from match data
        this.participants = [
            {
                id: 'system-admin',
                name: 'الـمشرف الأساسي',
                avatarInitial: 'م',
                role: ChatParticipantRole.ADMIN,
                isOnline: true
            },
            {
                id: this.match.tournamentCreatorId || 'organizer',
                name: 'مـنظم البطولة',
                avatarInitial: 'ن',
                role: ChatParticipantRole.ADMIN,
                isOnline: true
            },
            {
                id: this.match.homeTeamId + '-cap',
                name: `قائد ${this.match.homeTeamName}`,
                avatarInitial: 'ق',
                role: ChatParticipantRole.CAPTAIN,
                teamId: this.match.homeTeamId,
                isOnline: true
            },
            {
                id: this.match.awayTeamId + '-cap',
                name: `قائد ${this.match.awayTeamName}`,
                avatarInitial: 'ق',
                role: ChatParticipantRole.CAPTAIN,
                teamId: this.match.awayTeamId,
                isOnline: true
            }
        ];
    }

    isMe(msg: ChatMessage): boolean {
        return msg.senderId === this.currentUser?.id;
    }

    getCurrentUserRole(): ChatParticipantRole {
        if (!this.currentUser) return ChatParticipantRole.PLAYER;

        if (this.currentUser.role === UserRole.ADMIN) return ChatParticipantRole.ADMIN;

        if (this.permissionsService.isTeamCaptain()) return ChatParticipantRole.CAPTAIN;

        return ChatParticipantRole.PLAYER;
    }

    getRoleLabel(role: ChatParticipantRole): string {
        switch (role) {
            case ChatParticipantRole.ADMIN: return 'مشرف';
            case ChatParticipantRole.CAPTAIN: return 'قائد';
            case ChatParticipantRole.PLAYER: return 'لاعب';
            default: return '';
        }
    }

    getRoleBadgeClass(role: ChatParticipantRole): string {
        switch (role) {
            case ChatParticipantRole.ADMIN: return 'badge-danger';
            case ChatParticipantRole.CAPTAIN: return 'badge-gold';
            case ChatParticipantRole.PLAYER: return 'badge-primary';
            default: return 'badge-muted';
        }
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'اليوم';
        if (days === 1) return 'أمس';
        if (days < 7) return `منذ ${days} أيام`;
        return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
    }

    getOnlineCount(): number {
        return this.participants.filter(p => p.isOnline).length;
    }

    toggleParticipants(): void {
        this.showParticipants = !this.showParticipants;
    }

    getAdmin(): ChatParticipant | undefined {
        return this.participants.find(p => p.role === ChatParticipantRole.ADMIN);
    }

    getParticipantsByTeam(teamId: string): ChatParticipant[] {
        return this.participants.filter(p => p.teamId === teamId);
    }

    onSendMessage(text: string): void {
        if (!text?.trim() || !this.matchId) return;

        this.chatService.sendMessage(this.matchId, text.trim()).subscribe({
            error: () => this.uiFeedback.error('فشل الإرسال', 'تعذّر إرسال الرسالة. يرجى المحاولة مرة أخرى.')
        });
    }

    get isMatchFinished(): boolean {
        return this.match?.status === MatchStatus.FINISHED;
    }

    get mappedMessages(): ChatMessage[] {
        return this.realTimeMessages().map(m => ({
            id: m.id,
            text: m.content,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: this.translateRole(m.role),
            timestamp: new Date(m.timestamp)
        }));
    }

    private translateRole(role?: string): string {
        if (!role) return 'player';
        const r = role.toLowerCase();
        if (r === 'admin') return 'admin';
        if (r === 'tournamentcreator') return 'organizer';
        if (r === 'captain') return 'captain';
        return 'player';
    }

    goBack(): void {
        this.navService.navigateBack('matches');
    }

    getBackRoute(): string {
        const root = this.navService.getRootPrefix();
        return `${root}/matches`;
    }

    // Check if current user can schedule match (Admin only)
    canScheduleMatch(): boolean {
        if (!this.currentUser || !this.match) return false;
        return this.currentUser.role === UserRole.ADMIN ||
            this.currentUser.id === this.match.tournamentCreatorId;
    }

    // Open schedule modal
    openScheduleModal(): void {
        if (!this.canScheduleMatch()) return;

        // Pre-fill with existing schedule if available
        if (this.match?.scheduledDate) {
            this.scheduleDate = this.match.scheduledDate;
        } else {
            // Default to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.scheduleDate = tomorrow.toISOString().split('T')[0];
        }

        if (this.match?.scheduledTime) {
            this.scheduleTime = this.match.scheduledTime;
        } else {
            this.scheduleTime = '16:00';
        }

        this.showScheduleModal = true;
    }

    // Close schedule modal
    closeScheduleModal(): void {
        this.showScheduleModal = false;
        this.scheduleDate = '';
        this.scheduleTime = '';
    }

    // Save schedule
    saveSchedule(): void {
        if (!this.scheduleDate || !this.scheduleTime || !this.match) return;

        this.isSavingSchedule = true;

        // Construct ISO date string (approximate for the day/time)
        const dateStr = `${this.scheduleDate}T${this.scheduleTime}:00Z`;

        this.matchService.updateMatch(this.match.id, { date: new Date(dateStr) }).subscribe({
            next: () => {
                this.isSavingSchedule = false;
                this.showScheduleModal = false;
                this.uiFeedback.success('تم بنجاح', 'تم تحديد موعد المباراة بنجاح');

                // Send chat message
                const msgText = `تم تحديد موعد المباراة: ${this.formatScheduledDate(this.scheduleDate)} الساعة ${this.scheduleTime}`;
                this.onSendMessage(msgText);

                // Update local match object
                this.match!.date = new Date(dateStr);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Schedule Save Error:', err);
                this.uiFeedback.error('فشل الحفظ', 'تعذّر حفظ موعد المباراة. يرجى المحاولة مرة أخرى.');
                this.isSavingSchedule = false;
                this.cdr.detectChanges();
            }
        });
    }

    // Format scheduled date for display
    formatScheduledDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Get minimum date for scheduling (today)
    getMinDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    // Check if match is scheduled
    isMatchScheduled(): boolean {
        return !!(this.match?.scheduledDate && this.match?.scheduledTime);
    }
}

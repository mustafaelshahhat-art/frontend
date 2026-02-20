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
import { firstValueFrom } from 'rxjs';
import { ChatBoxComponent } from '../../../../shared/components/chat-box/chat-box.component';
import { ChatService } from '../../../../core/services/chat.service';
import { MatchService } from '../../../../core/services/match.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { Match, MatchStatus } from '../../../../core/models/tournament.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import {
    ChatParticipantRole,
    ChatMessage,
    ChatParticipant,
    formatTime as utilFormatTime,
    formatDate as utilFormatDate,
    getRoleLabel as utilGetRoleLabel,
    getRoleBadgeClass as utilGetRoleBadgeClass,
    translateRole,
    formatScheduledDate as utilFormatScheduledDate,
    getMinDate as utilGetMinDate,
    buildParticipants,
    checkMatchAuthorization,
} from './match-chat.utils';

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
        this.loadMatchData();
        this.notificationService.subscribeToMatch(this.matchId);
    }

    ngOnDestroy(): void {
        if (this.matchId) {
            this.chatService.leaveMatch();
        }
    }

    private async loadMatchData(): Promise<void> {
        this.isLoading = true;
        try {
            const match = await firstValueFrom(this.matchService.getMatchById(this.matchId));
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
        } catch (err: unknown) {
            console.error('Load Match Error:', err);
            this.uiFeedback.error('فشل التحميل', 'تعذّر تحميل بيانات المباراة. يرجى تحديث الصفحة.');
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    private checkAuthorization(): void {
        this.isAuthorized = checkMatchAuthorization(this.currentUser, this.match);
    }

    private loadParticipants(): void {
        if (!this.match) return;
        this.participants = buildParticipants(this.match);
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

    getRoleLabel = utilGetRoleLabel;
    getRoleBadgeClass = utilGetRoleBadgeClass;
    formatTime = utilFormatTime;
    formatDate = utilFormatDate;
    formatScheduledDate = utilFormatScheduledDate;
    getMinDate = utilGetMinDate;

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

    async onSendMessage(text: string): Promise<void> {
        if (!text?.trim() || !this.matchId) return;

        try {
            await firstValueFrom(this.chatService.sendMessage(this.matchId, text.trim()));
        } catch (e: unknown) {
            this.uiFeedback.error('فشل الإرسال', 'تعذّر إرسال الرسالة. يرجى المحاولة مرة أخرى.');
        }
    }

    get isMatchFinished(): boolean {
        return this.match?.status === MatchStatus.FINISHED;
    }

    get mappedMessages(): ChatMessage[] {
        const msgs = this.realTimeMessages();
        if (!msgs || !Array.isArray(msgs)) return [];

        return msgs.map(m => ({
            id: m.id,
            text: m.content,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: translateRole(m.role),
            timestamp: new Date(m.timestamp)
        }));
    }

    goBack(): void {
        this.navService.navigateBack('matches');
    }

    getBackRoute(): string {
        const root = this.navService.getRootPrefix();
        return `${root}/matches`;
    }

    canScheduleMatch(): boolean {
        if (!this.currentUser || !this.match) return false;
        return this.currentUser.role === UserRole.ADMIN ||
            this.currentUser.id === this.match.tournamentCreatorId;
    }

    openScheduleModal(): void {
        if (!this.canScheduleMatch()) return;

        if (this.match?.scheduledDate) {
            this.scheduleDate = this.match.scheduledDate;
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.scheduleDate = tomorrow.toISOString().split('T')[0];
        }

        this.scheduleTime = this.match?.scheduledTime || '16:00';
        this.showScheduleModal = true;
    }

    closeScheduleModal(): void {
        this.showScheduleModal = false;
        this.scheduleDate = '';
        this.scheduleTime = '';
    }

    async saveSchedule(): Promise<void> {
        if (!this.scheduleDate || !this.scheduleTime || !this.match) return;

        this.isSavingSchedule = true;
        const dateStr = `${this.scheduleDate}T${this.scheduleTime}:00Z`;

        try {
            await firstValueFrom(this.matchService.updateMatch(this.match.id, { date: new Date(dateStr) }));
            this.isSavingSchedule = false;
            this.showScheduleModal = false;
            this.uiFeedback.success('تم بنجاح', 'تم تحديد موعد المباراة بنجاح');

            const msgText = `تم تحديد موعد المباراة: ${this.formatScheduledDate(this.scheduleDate)} الساعة ${this.scheduleTime}`;
            this.onSendMessage(msgText);

            this.match!.date = new Date(dateStr);
            this.cdr.detectChanges();
        } catch (err: unknown) {
            console.error('Schedule Save Error:', err);
            this.uiFeedback.error('فشل الحفظ', 'تعذّر حفظ موعد المباراة. يرجى المحاولة مرة أخرى.');
            this.isSavingSchedule = false;
            this.cdr.detectChanges();
        }
    }

    isMatchScheduled(): boolean {
        return !!(this.match?.scheduledDate && this.match?.scheduledTime);
    }
}

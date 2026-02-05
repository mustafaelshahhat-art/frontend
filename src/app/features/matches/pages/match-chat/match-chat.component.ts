import { Component, OnInit, ViewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserRole } from '../../../../core/models/user.model';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChatBoxComponent } from '../../../../features/chat/components/chat-box/chat-box.component';
import { ChatService } from '../../../../core/services/chat.service';
import { MatchService } from '../../../../core/services/match.service';
import { MatchMessage } from '../../../../core/models/tournament.model';

export enum ChatParticipantRole {
    CAPTAIN = 'captain',
    PLAYER = 'player',
    REFEREE = 'referee',
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

import { Match } from '../../../../core/models/tournament.model';

@Component({
    selector: 'app-match-chat',
    standalone: true,
    imports: [CommonModule, ChatBoxComponent],
    templateUrl: './match-chat.component.html',
    styleUrls: ['./match-chat.component.scss']
})
export class MatchChatComponent implements OnInit, OnDestroy {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private uiFeedback = inject(UIFeedbackService);
    private chatService = inject(ChatService);
    private matchService = inject(MatchService);

    ChatParticipantRole = ChatParticipantRole;

    messages: ChatMessage[] = [];
    newMessage = '';
    showParticipants = true;
    currentUser: User | null = null;
    isAuthorized = false;
    isLoading = true;
    matchId: string = '';

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
    }

    ngOnDestroy(): void {
        if (this.matchId) {
            this.chatService.leaveMatch(this.matchId);
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
                        this.chatService.joinMatch(this.matchId);
                        this.loadParticipants();
                    }
                }
                this.isLoading = false;
            },
            error: () => {
                this.uiFeedback.error('خطأ', 'فشل في تحميل بيانات المباراة');
                this.isLoading = false;
            }
        });
    }

    private checkAuthorization(): void {
        if (!this.currentUser || !this.match) {
            this.isAuthorized = false;
            return;
        }

        const userId = this.currentUser.id;
        const userRole = this.currentUser.role;

        // Admin can access all chats
        if (userRole === UserRole.ADMIN) {
            this.isAuthorized = true;
            return;
        }

        // Referee assigned to this match
        if (userRole === UserRole.REFEREE && this.match.refereeId === userId) {
            this.isAuthorized = true;
            return;
        }

        // Captain or Player of one of the teams
        if (this.currentUser.teamId === this.match.homeTeamId || this.currentUser.teamId === this.match.awayTeamId) {
            this.isAuthorized = true;
            return;
        }

        this.isAuthorized = false;
    }

    private loadParticipants(): void {
        if (!this.match) return;

        this.participants = [
            // Referee
            { id: '2', name: 'محمد علي', avatarInitial: 'م', role: ChatParticipantRole.REFEREE, isOnline: true },
            // Admin (if applicable)
            { id: '1', name: 'عبد الله أحمد', avatarInitial: 'ع', role: ChatParticipantRole.ADMIN, isOnline: true },
            // Home team
            { id: '3', name: 'أحمد القائد', avatarInitial: 'أ', role: ChatParticipantRole.CAPTAIN, teamId: 't1', isOnline: true },
            { id: 'p1', name: 'محمد اللاعب', avatarInitial: 'م', role: ChatParticipantRole.PLAYER, teamId: 't1', isOnline: true },
            { id: 'p2', name: 'علي اللاعب', avatarInitial: 'ع', role: ChatParticipantRole.PLAYER, teamId: 't1', isOnline: false },
            // Away team
            { id: 'captain-2', name: 'خالد القائد', avatarInitial: 'خ', role: ChatParticipantRole.CAPTAIN, teamId: 'team-2', isOnline: true },
            { id: 'p4', name: 'سعد اللاعب', avatarInitial: 'س', role: ChatParticipantRole.PLAYER, teamId: 'team-2', isOnline: true },
            { id: 'p5', name: 'فهد اللاعب', avatarInitial: 'ف', role: ChatParticipantRole.PLAYER, teamId: 'team-2', isOnline: false }
        ];
    }

    private loadMessages(): void {
        // Mock messages - in real app, fetch from API
        this.messages = [
            {
                id: 'sys-1',
                text: 'تم إنشاء غرفة الدردشة للمباراة. يرجى الاتفاق على موعد المباراة خلال 3 أيام.',
                senderName: 'النظام',
                senderId: 'system',
                senderRole: ChatParticipantRole.ADMIN,
                timestamp: new Date(Date.now() - 86400000),
                isSystem: true
            },
            {
                id: '1',
                text: 'السلام عليكم، متى يناسبكم موعد المباراة؟',
                senderName: 'أحمد القائد',
                senderId: '3',
                senderRole: ChatParticipantRole.CAPTAIN,
                timestamp: new Date(Date.now() - 3600000)
            },
            {
                id: '2',
                text: 'وعليكم السلام، يوم الجمعة الساعة 4 العصر مناسب لنا',
                senderName: 'خالد القائد',
                senderId: 'captain-2',
                senderRole: ChatParticipantRole.CAPTAIN,
                timestamp: new Date(Date.now() - 3000000)
            },
            {
                id: '3',
                text: 'ممتاز، أنا متاح في هذا الموعد. سأكون جاهزاً للتحكيم.',
                senderName: 'محمد علي',
                senderId: '2',
                senderRole: ChatParticipantRole.REFEREE,
                timestamp: new Date(Date.now() - 2400000)
            }
        ];
    }

    isMe(msg: ChatMessage): boolean {
        return msg.senderId === this.currentUser?.id;
    }

    getCurrentUserRole(): ChatParticipantRole {
        if (!this.currentUser) return ChatParticipantRole.PLAYER;

        switch (this.currentUser.role) {
            case UserRole.ADMIN: return ChatParticipantRole.ADMIN;
            case UserRole.REFEREE: return ChatParticipantRole.REFEREE;
            case UserRole.CAPTAIN: return ChatParticipantRole.CAPTAIN;
            default: return ChatParticipantRole.PLAYER;
        }
    }

    getRoleLabel(role: ChatParticipantRole): string {
        switch (role) {
            case ChatParticipantRole.ADMIN: return 'مشرف';
            case ChatParticipantRole.CAPTAIN: return 'قائد';
            case ChatParticipantRole.PLAYER: return 'لاعب';
            case ChatParticipantRole.REFEREE: return 'حكم';
            default: return '';
        }
    }

    getRoleBadgeClass(role: ChatParticipantRole): string {
        switch (role) {
            case ChatParticipantRole.ADMIN: return 'badge-danger';
            case ChatParticipantRole.CAPTAIN: return 'badge-gold';
            case ChatParticipantRole.PLAYER: return 'badge-primary';
            case ChatParticipantRole.REFEREE: return 'badge-info';
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

    getReferee(): ChatParticipant | undefined {
        return this.participants.find(p => p.role === ChatParticipantRole.REFEREE);
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
            error: () => this.uiFeedback.error('خطأ', 'فشل في إرسال الرسالة')
        });
    }

    get mappedMessages(): ChatMessage[] {
        return this.realTimeMessages().map(m => ({
            id: m.id,
            text: m.content,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.role,
            timestamp: m.timestamp
        }));
    }

    goBack(): void {
        if (this.currentUser) {
            switch (this.currentUser.role) {
                case UserRole.ADMIN:
                    this.router.navigate(['/admin/matches']);
                    break;
                case UserRole.REFEREE:
                    this.router.navigate(['/referee/matches']);
                    break;
                case UserRole.CAPTAIN:
                case UserRole.PLAYER:
                    this.router.navigate(['/captain/matches']);
                    break;
                default:
                    this.router.navigate(['/']);
            }
        } else {
            this.router.navigate(['/']);
        }
    }

    getBackRoute(): string {
        if (!this.currentUser) return '/';

        switch (this.currentUser.role) {
            case UserRole.ADMIN: return '/admin/matches';
            case UserRole.REFEREE: return '/referee/matches';
            default: return '/captain/matches';
        }
    }

    // Check if current user can schedule match (Admin or Referee only)
    canScheduleMatch(): boolean {
        if (!this.currentUser) return false;
        return this.currentUser.role === UserRole.ADMIN || this.currentUser.role === UserRole.REFEREE;
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

        // In real app, call API to save
        setTimeout(() => {
            this.match!.scheduledDate = this.scheduleDate;
            this.match!.scheduledTime = this.scheduleTime;

            // Add system message
            const scheduleMessage: ChatMessage = {
                id: Date.now().toString(),
                text: `تم تحديد موعد المباراة: ${this.formatScheduledDate(this.scheduleDate)} الساعة ${this.scheduleTime}`,
                senderName: 'النظام',
                senderId: 'system',
                senderRole: ChatParticipantRole.ADMIN,
                timestamp: new Date(),
                isSystem: true
            };
            this.messages.push(scheduleMessage);

            this.isSavingSchedule = false;
            this.showScheduleModal = false;
            this.uiFeedback.success('تم بنجاح', 'تم تحديد موعد المباراة بنجاح');

            // Scroll to bottom
            setTimeout(() => {
                if (this.messagesContainer) {
                    this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
                }
            }, 100);
        }, 500);
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

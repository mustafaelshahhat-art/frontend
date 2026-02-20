import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Match } from '../../../core/models/tournament.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { FormControlComponent } from '../form-control/form-control.component';

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    timestamp: Date;
}

export interface ChatParticipant {
    id: string;
    name: string;
    role: string;
    teamId?: string;
}

@Component({
    selector: 'app-chat-box',
    standalone: true,
    imports: [IconComponent, CommonModule, FormsModule, IconButtonComponent, FormControlComponent, ReactiveFormsModule],
    templateUrl: './chat-box.component.html',
    styleUrls: ['./chat-box.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatBoxComponent implements OnInit, AfterViewChecked {
    @Input() title = 'المحادثة المباشرة';
    @Input() match: Match | null = null;
    @Input() messages: ChatMessage[] = [];
    @Input() currentUserId = '';
    @Input() participants: ChatParticipant[] = [];

    @Input() isLoading = false;
    @Input() readOnly = false;
    @Input() canSchedule = false;

    @Output() send = new EventEmitter<string>();
    @Output() back = new EventEmitter<void>();
    @Output() schedule = new EventEmitter<void>();

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    newMessage = '';

    private router = inject(Router);

    ngOnInit(): void {
        this.scrollToBottom();
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        try {
            if (this.scrollContainer) {
                this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
            }
        } catch {
            // Container might not be available yet
        }
    }

    sendMessage(): void {
        if (this.newMessage.trim()) {
            this.send.emit(this.newMessage);
            this.newMessage = '';
        }
    }

    navigateBack(): void {
        this.back.emit();
    }

    isMe(msg: ChatMessage): boolean {
        return msg.senderId === this.currentUserId;
    }

    trackByMessage(_index: number, message: ChatMessage): string {
        return message.id;
    }
}

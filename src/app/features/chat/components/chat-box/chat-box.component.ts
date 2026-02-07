import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { IconButtonComponent } from '../../../../shared/components/icon-button/icon-button.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';

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
    imports: [CommonModule, FormsModule, ButtonComponent, IconButtonComponent, FormControlComponent],
    templateUrl: './chat-box.component.html',
    styleUrls: ['./chat-box.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatBoxComponent implements OnInit, AfterViewChecked {
    @Input() title = 'المحادثة المباشرة';
    @Input() match: any; // Using any for flexibility, better to define Match interface
    @Input() messages: ChatMessage[] = [];
    @Input() currentUserId: string = '';
    @Input() participants: ChatParticipant[] = [];
    @Input() referee: ChatParticipant | null = null;
    @Input() isLoading = false;
    @Input() readOnly = false;

    @Output() send = new EventEmitter<string>();
    @Output() back = new EventEmitter<void>();

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    newMessage = '';
    sidebarOpen = false;

    constructor(private router: Router) { }

    ngOnInit(): void {
        this.scrollToBottom();
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }

    sendMessage(): void {
        if (this.newMessage.trim()) {
            this.send.emit(this.newMessage);
            this.newMessage = '';
        }
    }

    toggleSidebar(): void {
        this.sidebarOpen = !this.sidebarOpen;
    }

    navigateBack(): void {
        this.back.emit();
    }

    isMe(msg: ChatMessage): boolean {
        return msg.senderId === this.currentUserId;
    }

    trackByMessage(index: number, message: ChatMessage): string {
        return message.id;
    }

    trackByParticipant(index: number, participant: ChatParticipant): string {
        return participant.id;
    }
}

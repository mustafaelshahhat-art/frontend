import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MatchMessage } from '../models/tournament.model';
import { SignalRService } from './signalr.service';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private readonly http = inject(HttpClient);
    private readonly signalRService = inject(SignalRService);
    private readonly apiUrl = `${environment.apiUrl}/matches`;

    private messagesSubject = new BehaviorSubject<MatchMessage[]>([]);
    public messages = this.messagesSubject.asObservable();

    private currentMatchId: string | null = null;

    async joinMatch(matchId: string): Promise<void> {
        if (this.currentMatchId === matchId) return;

        if (this.currentMatchId) {
            await this.leaveMatch(this.currentMatchId);
        }

        this.currentMatchId = matchId;
        this.loadHistory(matchId);

        const connection = this.signalRService.createConnection('chat');

        // Remove existing listener if any to avoid duplicates
        connection.off('ReceiveMessage');

        connection.on('ReceiveMessage', (message: MatchMessage) => {
            if (message.matchId === this.currentMatchId) {
                this.messagesSubject.next([...this.messagesSubject.value, message]);
            }
        });

        await this.signalRService.startConnection('chat');

        if (connection.state === 'Connected') {
            await connection.invoke('JoinMatchGroup', matchId);
        }
    }

    async leaveMatch(matchId: string): Promise<void> {
        if (!this.currentMatchId) return;

        const connection = this.signalRService.createConnection('chat');
        if (connection.state === 'Connected') {
            await connection.invoke('LeaveMatchGroup', this.currentMatchId);
        }
        this.currentMatchId = null;
        this.messagesSubject.next([]);
    }

    sendMessage(matchId: string, content: string): Observable<void> {
        return new Observable<void>(observer => {
            const connection = this.signalRService.createConnection('chat');
            if (connection.state !== 'Connected') {
                observer.error('SignalR is not connected');
                return;
            }
            connection.invoke('SendMessage', matchId, content)
                .then(() => {
                    observer.next();
                    observer.complete();
                })
                .catch(err => observer.error(err));
        });
    }

    private loadHistory(matchId: string): void {
        this.http.get<MatchMessage[]>(`${this.apiUrl}/${matchId}/chat`).subscribe({
            next: (messages) => {
                this.messagesSubject.next(messages);
            },
            error: (err) => {
                console.error('History load error:', err);
                this.messagesSubject.next([]);
            }
        });
    }
}

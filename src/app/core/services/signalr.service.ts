import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, timer } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class SignalRService {
    private readonly authService = inject(AuthService);
    private hubs: Map<string, signalR.HubConnection> = new Map<string, signalR.HubConnection>();
    private connectionStatus$ = new BehaviorSubject<boolean>(false);

    get isConnected$(): Observable<boolean> {
        return this.connectionStatus$.asObservable();
    }

    isConnected(hubPath: string): boolean {
        const connection = this.hubs.get(hubPath);
        return connection?.state === signalR.HubConnectionState.Connected;
    }

    createConnection(hubPath: string): signalR.HubConnection {
        if (this.hubs.has(hubPath)) {
            return this.hubs.get(hubPath)!;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${environment.hubUrl}/${hubPath}`, {
                accessTokenFactory: () => this.authService.getToken() || '',
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.hubs.set(hubPath, connection);
        return connection;
    }

    async startConnection(hubPath: string): Promise<void> {
        const connection = this.hubs.get(hubPath);
        if (!connection) return;

        if (connection.state === signalR.HubConnectionState.Disconnected) {
            try {
                await connection.start();
                this.connectionStatus$.next(true);
            } catch (err) {
                console.error(`SignalR: Error connecting to ${hubPath}:`, err);
                timer(5000).subscribe(() => this.startConnection(hubPath));
            }
        }
    }

    async stopConnection(hubPath: string): Promise<void> {
        const connection = this.hubs.get(hubPath);
        if (connection) {
            try {
                await connection.stop();
            } catch (err) {
                console.error(`SignalR: Error stopping ${hubPath}:`, err);
            }
            this.hubs.delete(hubPath);
        }
    }

    async stopAllConnections(): Promise<void> {
        const paths = Array.from(this.hubs.keys());
        for (const path of paths) {
            await this.stopConnection(path);
        }
        this.connectionStatus$.next(false);
    }
}

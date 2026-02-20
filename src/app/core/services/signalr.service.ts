import { Injectable, inject } from '@angular/core';
import type * as signalRTypes from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PERF: Dynamic import — @microsoft/signalr (~50KB) is loaded on first use, not at bootstrap.
// The module is cached after first load so subsequent calls are instant.
let signalRModule: typeof import('@microsoft/signalr') | null = null;
async function getSignalR(): Promise<typeof import('@microsoft/signalr')> {
    if (!signalRModule) {
        signalRModule = await import('@microsoft/signalr');
    }
    return signalRModule;
}

@Injectable({
    providedIn: 'root',
})
export class SignalRService {
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private hubs: Map<string, signalRTypes.HubConnection> = new Map();
    private connectionStatus$ = new BehaviorSubject<boolean>(false);

    get isConnected$(): Observable<boolean> {
        return this.connectionStatus$.asObservable();
    }

    async isConnectedAsync(hubPath: string): Promise<boolean> {
        const signalR = await getSignalR();
        const connection = this.hubs.get(hubPath);
        return connection?.state === signalR.HubConnectionState.Connected;
    }

    isConnected(hubPath: string): boolean {
        const connection = this.hubs.get(hubPath);
        // Fallback sync check — state string comparison when module not yet loaded
        return (connection?.state as unknown) === 'Connected';
    }

    async createConnection(hubPath: string): Promise<signalRTypes.HubConnection> {
        if (this.hubs.has(hubPath)) {
            return this.hubs.get(hubPath)!;
        }

        const signalR = await getSignalR();

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${environment.hubUrl}/${hubPath}`, {
                accessTokenFactory: () => this.authService.getToken() || '',
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .configureLogging(environment.production ? signalR.LogLevel.Warning : signalR.LogLevel.Information)
            .build();

        this.hubs.set(hubPath, connection);
        return connection;
    }

    async startConnection(hubPath: string): Promise<void> {
        const signalR = await getSignalR();
        let connection = this.hubs.get(hubPath);
        if (!connection) {
            connection = await this.createConnection(hubPath);
        }

        if (connection.state === signalR.HubConnectionState.Disconnected) {
            try {
                await connection.start();
                this.connectionStatus$.next(true);
            } catch (err) {
                console.error(`SignalR: Error connecting to ${hubPath}:`, err);
                timer(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.startConnection(hubPath));
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

    async subscribeToGroup(hubPath: string, groupName: string): Promise<void> {
        const signalR = await getSignalR();
        const connection = this.hubs.get(hubPath);
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            try {
                let method = '';
                if (groupName.startsWith('tournament:')) method = 'SubscribeToTournament';
                else if (groupName.startsWith('match:')) method = 'SubscribeToMatch';
                else if (groupName.startsWith('role:')) method = 'SubscribeToRole';

                if (method) {
                    const id = groupName.split(':')[1];
                    await connection.invoke(method, id);
                }
            } catch (err) {
                console.error(`SignalR: Error subscribing to ${groupName}:`, err);
            }
        }
    }

    async unsubscribeFromGroup(hubPath: string, groupName: string): Promise<void> {
        const signalR = await getSignalR();
        const connection = this.hubs.get(hubPath);
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            try {
                let method = '';
                if (groupName.startsWith('tournament:')) method = 'UnsubscribeFromTournament';
                else if (groupName.startsWith('match:')) method = 'UnsubscribeFromMatch';
                else if (groupName.startsWith('role:')) method = 'UnsubscribeFromRole';

                if (method) {
                    const id = groupName.split(':')[1];
                    await connection.invoke(method, id);
                }
            } catch (err) {
                console.error(`SignalR: Error unsubscribing from ${groupName}:`, err);
            }
        }
    }
}

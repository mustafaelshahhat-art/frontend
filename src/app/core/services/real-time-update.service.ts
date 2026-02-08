import { Injectable, inject, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from './auth.service';
import { SignalRService } from './signalr.service';
import { TournamentStore } from '../stores/tournament.store';
import { MatchStore } from '../stores/match.store';
import { TeamStore } from '../stores/team.store';
import { UserStore } from '../stores/user.store';
import { ObjectionStore } from '../stores/objection.store';
import * as signalR from '@microsoft/signalr';

export interface SystemEvent {
    type: string;
    metadata: any;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class RealTimeUpdateService {
    private readonly authService = inject(AuthService);
    private readonly signalRService = inject(SignalRService);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly ngZone = inject(NgZone);

    private readonly tournamentStore = inject(TournamentStore);
    private readonly matchStore = inject(MatchStore);
    private readonly teamStore = inject(TeamStore);
    private readonly userStore = inject(UserStore);
    private readonly objectionStore = inject(ObjectionStore);

    private hubConnection: signalR.HubConnection | null = null;
    private listenersBound = false;

    private events$ = new Subject<SystemEvent>();
    public systemEvents$ = this.events$.asObservable();

    constructor() {
        this.initializeSignalR();
    }

    ensureInitialized(): void {
        this.initializeSignalR();
    }

    dispatch(event: any): void {
        const systemEvent: SystemEvent = {
            type: event?.type || event?.Type || '',
            metadata: event?.metadata || event?.Metadata || {},
            timestamp: new Date(event?.timestamp || event?.Timestamp || Date.now())
        };

        if (this.handleCriticalActions(systemEvent)) {
            return;
        }

        this.events$.next(systemEvent);
    }

    on(type: string | string[]): Observable<SystemEvent> {
        const types = Array.isArray(type) ? type : [type];
        return this.systemEvents$.pipe(filter(event => types.includes(event.type)));
    }

    setEditingState(_isEditing: boolean): void {
        // Deprecated compatibility no-op.
    }

    private initializeSignalR(): void {
        const connection = this.signalRService.createConnection('notifications');
        if (this.hubConnection !== connection) {
            this.hubConnection = connection;
            this.listenersBound = false;
        }

        if (!this.listenersBound) {
            this.bindHubListeners();
            this.listenersBound = true;
        }

        this.signalRService.startConnection('notifications');
    }

    private bindHubListeners(): void {
        if (!this.hubConnection) {
            return;
        }

        this.hubConnection.on('TournamentCreated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.tournamentStore.upsertTournament(dto);
                }
            });
        });

        this.hubConnection.on('TournamentUpdated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.tournamentStore.upsertTournament(dto);
                }
            });
        });

        this.hubConnection.on('TournamentDeleted', (payload: any) => {
            this.ngZone.run(() => {
                const tournamentId = this.extractId(payload, 'tournamentId');
                if (tournamentId) {
                    this.tournamentStore.removeTournament(tournamentId);
                    this.matchStore.removeMatchesByTournament(tournamentId);
                }
            });
        });

        this.hubConnection.on('RegistrationApproved', (tournamentDto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(tournamentDto, 'id')) {
                    this.tournamentStore.upsertTournament(tournamentDto);
                }
            });
        });

        this.hubConnection.on('RegistrationRejected', (tournamentDto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(tournamentDto, 'id')) {
                    this.tournamentStore.upsertTournament(tournamentDto);
                }
            });
        });

        this.hubConnection.on('RegistrationUpdated', (registrationDto: any) => {
            this.ngZone.run(() => {
                const tournamentId = this.readValue<string>(registrationDto, 'tournamentId');
                if (tournamentId && registrationDto) {
                    this.tournamentStore.updateRegistration(tournamentId, registrationDto);
                }
            });
        });

        this.hubConnection.on('MatchCreated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.matchStore.upsertMatch(dto);
                }
            });
        });

        this.hubConnection.on('MatchUpdated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.matchStore.upsertMatch(dto);
                }
            });
        });

        this.hubConnection.on('MatchesGenerated', (dtos: any[]) => {
            this.ngZone.run(() => {
                (dtos || []).forEach(match => {
                    if (this.extractId(match, 'id')) {
                        this.matchStore.upsertMatch(match);
                    }
                });
            });
        });

        this.hubConnection.on('MatchDeleted', (payload: any) => {
            this.ngZone.run(() => {
                const matchId = this.extractId(payload, 'matchId');
                if (matchId) {
                    this.matchStore.removeMatch(matchId);
                }
            });
        });

        this.hubConnection.on('TeamCreated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.teamStore.upsertTeam(dto);
                }
            });
        });

        this.hubConnection.on('TeamUpdated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.teamStore.upsertTeam(dto);
                    this.cascadeTeamUpdateToTournaments(dto);
                }
            });
        });

        this.hubConnection.on('TeamDeleted', (payload: any) => {
            this.ngZone.run(() => {
                const teamId = this.extractId(payload, 'teamId');
                if (teamId) {
                    this.teamStore.removeTeam(teamId);
                    this.tournamentStore.removeTeamFromRegistrations(teamId);
                    this.matchStore.removeMatchesByTeam(teamId);
                    this.userStore.clearTeamMembership(teamId);

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.teamId === teamId) {
                        this.authService.clearTeamAssociation();
                    }
                }
            });
        });

        this.hubConnection.on('RemovedFromTeam', (data: any) => {
            this.ngZone.run(() => {
                const teamId = this.readValue<string>(data, 'teamId');
                const playerId = this.readValue<string>(data, 'playerId');
                if (teamId && playerId) {
                    this.removePlayerFromTeamStore(teamId, playerId);

                    const affectedUser = this.userStore.getUserById(playerId);
                    if (affectedUser) {
                        this.userStore.upsertUser({
                            ...affectedUser,
                            teamId: undefined,
                            teamName: undefined,
                            isTeamOwner: false
                        });
                    }

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.id === playerId) {
                        this.authService.clearTeamAssociation();
                    }
                }
            });
        });

        this.hubConnection.on('UserCreated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.userStore.upsertUser(dto);
                }
            });
        });

        this.hubConnection.on('UserUpdated', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.userStore.upsertUser(dto);

                    // Sync with AuthStore if this is the current user
                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser && dto.id === currentUser.id) {
                        this.authService.updateCurrentUser(dto);
                    }
                }
            });
        });

        this.hubConnection.on('UserDeleted', (payload: any) => {
            this.ngZone.run(() => {
                const userId = this.extractId(payload, 'userId');
                if (userId) {
                    this.userStore.removeUser(userId);

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.id === userId) {
                        this.authService.logout();
                    }
                }
            });
        });

        this.hubConnection.on('AccountStatusChanged', (data: any) => {
            this.ngZone.run(() => {
                const userId = this.readValue<string>(data, 'userId');
                const status = this.readValue<string>(data, 'status');
                if (userId && status) {
                    const user = this.userStore.getUserById(userId);
                    if (user) {
                        this.userStore.upsertUser({ ...user, status: status as any });
                    }

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.id === userId) {
                        this.authService.updateUserStatus(status);
                    }
                }
            });
        });

        this.hubConnection.on('ObjectionSubmitted', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.objectionStore.upsertObjection(dto);
                    // Show notification for admin if needed
                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.role === 'Admin') {
                        this.uiFeedback.info('اعتراض جديد', `قام فريق ${dto.teamName || 'مجهول'} بتقديم اعتراض جديد`);
                    }
                }
            });
        });

        this.hubConnection.on('ObjectionResolved', (dto: any) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.objectionStore.upsertObjection(dto);
                }
            });
        });

        this.hubConnection.on('SystemEvent', (event: any) => {
            this.ngZone.run(() => {
                this.dispatch(event);
            });
        });
    }

    private handleCriticalActions(event: SystemEvent): boolean {
        const userId = this.readValue<string>(event.metadata, 'userId');
        const currentUser = this.authService.getCurrentUser();

        if (event.type === 'USER_BLOCKED' && currentUser && userId === currentUser.id) {
            this.uiFeedback.error('Account blocked', 'Your account was blocked by an administrator.');
            setTimeout(() => {
                this.authService.logout();
            }, 1500);
            return true;
        }

        if (event.type === 'USER_APPROVED' && currentUser && userId === currentUser.id) {
            this.uiFeedback.success('Account approved', 'Your account is now active.');
            this.authService.refreshUserProfile().subscribe();
            return true;
        }

        return false;
    }

    private cascadeTeamUpdateToTournaments(team: any): void {
        const tournaments = this.tournamentStore.tournaments();

        tournaments.forEach(tournament => {
            const registrations = tournament.registrations || [];
            if (!registrations.some(r => r.teamId === team.id)) {
                return;
            }

            const updatedRegistrations = registrations.map(registration => {
                if (registration.teamId !== team.id) {
                    return registration;
                }

                return {
                    ...registration,
                    teamName: team.name,
                    teamLogoUrl: team.logoUrl || team.logo,
                    captainId: team.captainId,
                    captainName: team.captainName
                };
            });

            this.tournamentStore.upsertTournament({
                ...tournament,
                registrations: updatedRegistrations
            });
        });
    }

    private removePlayerFromTeamStore(teamId: string, playerId: string): void {
        const team = this.teamStore.getTeamById(teamId);
        if (!team) {
            return;
        }

        const players = (team.players || []).filter((player: any) => {
            const id = String(player?.id || '');
            const userId = String(player?.userId || '');
            return id !== playerId && userId !== playerId;
        });

        this.teamStore.upsertTeam({
            ...team,
            players,
            playerCount: players.length
        } as any);
    }

    private extractId(payload: any, preferredKey: string): string | null {
        if (!payload) {
            return null;
        }

        if (typeof payload === 'string') {
            return payload;
        }

        if (typeof payload === 'object') {
            const preferred = this.readValue<string>(payload, preferredKey);
            if (preferred) {
                return preferred;
            }

            const generic = this.readValue<string>(payload, 'id');
            if (generic) {
                return generic;
            }
        }

        return null;
    }

    private readValue<T = any>(source: any, key: string): T | null {
        if (!source || typeof source !== 'object') {
            return null;
        }

        const camel = key;
        const pascal = key.charAt(0).toUpperCase() + key.slice(1);

        return (source[camel] ?? source[pascal] ?? null) as T | null;
    }
}

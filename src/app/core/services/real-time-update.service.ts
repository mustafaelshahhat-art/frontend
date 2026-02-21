/* eslint-disable no-restricted-syntax */
import { Injectable, inject, NgZone, OnDestroy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from './auth.service';
import { SignalRService } from './signalr.service';
import { TournamentService } from './tournament.service';
import { MatchService } from './match.service';
import { TournamentStore } from '../stores/tournament.store';
import { MatchStore } from '../stores/match.store';
import { TeamStore } from '../stores/team.store';
import { UserStore } from '../stores/user.store';
import type { HubConnection } from '@microsoft/signalr';
import type { Tournament, TeamRegistration as TournamentRegistration } from '../models/tournament.model';
import type { Match } from '../models/match.model';
import type { Team, Player } from '../models/team.model';
import type { User, UserStatus } from '../models/user.model';

export interface SystemEvent {
    type: string;
    metadata: Record<string, unknown>;
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
    private readonly tournamentService = inject(TournamentService);
    private readonly matchService = inject(MatchService);
    private readonly destroyRef = inject(DestroyRef);


    private hubConnection: HubConnection | null = null;
    private listenersBound = false;

    private events$ = new Subject<SystemEvent>();
    public systemEvents$ = this.events$.asObservable();

    constructor() {
        // Constructor no longer auto-starts SignalR.
        // It's manually triggered by NotificationService or ChatService when needed.
    }

    ensureInitialized(): void {
        this.initializeSignalR();
    }

    dispatch(event: Partial<SystemEvent>): void {
        const systemEvent: SystemEvent = {
            type: event?.type || '',
            metadata: (event?.metadata || {}) as Record<string, unknown>,
            timestamp: new Date(event?.timestamp || Date.now())
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

    setEditingState(): void {
        // Deprecated compatibility no-op.
    }

    private async initializeSignalR(): Promise<void> {
        const token = this.authService.getToken();
        if (!token) {
            console.warn('SignalR: No token available, skipping initialization.');
            return;
        }

        const connection = await this.signalRService.createConnection('notifications');
        if (this.hubConnection !== connection) {
            this.hubConnection = connection;
            this.listenersBound = false;
        }

        if (!this.listenersBound) {
            this.bindHubListeners();
            this.listenersBound = true;
        }

        await this.signalRService.startConnection('notifications');

        // Subscribe to Admin role if user is Admin
        const user = this.authService.getCurrentUser();
        if (user?.role === 'Admin' && this.hubConnection) {
            try {
                await this.hubConnection.invoke('SubscribeToRole', 'Admin');
            } catch (err) {
                console.warn('Could not join role:Admin group', err);
            }
        }
    }

    private bindHubListeners(): void {
        if (!this.hubConnection) {
            return;
        }

        this.hubConnection.on('TournamentCreated', (dto: Tournament) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.tournamentStore.upsertTournament(dto);
                    this.tournamentService.invalidateCache('list');
                }
            });
        });

        this.hubConnection.on('TournamentUpdated', (dto: Tournament) => {
            this.ngZone.run(() => {
                const id = this.extractId(dto, 'id');
                if (id) {
                    // Merge: preserve existing fields (registrations, rules, etc.)
                    // that are stripped from the slim SignalR payload
                    const existing = this.tournamentStore.getTournamentById(id);
                    if (existing) {
                        this.tournamentStore.updateTournament({ ...existing, ...dto });
                    } else {
                        this.tournamentStore.upsertTournament(dto);
                    }
                    this.tournamentService.invalidateCache(`detail:${id}`);
                    this.tournamentService.invalidateCache('list');
                }
            });
        });

        this.hubConnection.on('TournamentDeleted', (payload: { tournamentId?: string; id?: string }) => {
            this.ngZone.run(() => {
                const tournamentId = this.extractId(payload, 'tournamentId');
                if (tournamentId) {
                    this.tournamentStore.removeTournament(tournamentId);
                    this.matchStore.removeMatchesByTournament(tournamentId);
                    this.tournamentService.invalidateCache();
                    this.matchService.invalidateCache(`tournament:${tournamentId}`);
                }
            });
        });

        this.hubConnection.on('RegistrationApproved', (tournamentDto: Tournament) => {
            this.ngZone.run(() => {
                const id = this.extractId(tournamentDto, 'id');
                if (id) {
                    // Merge: preserve registrations list from existing store entry
                    const existing = this.tournamentStore.getTournamentById(id);
                    if (existing) {
                        this.tournamentStore.updateTournament({ ...existing, ...tournamentDto });
                    } else {
                        this.tournamentStore.upsertTournament(tournamentDto);
                    }
                    this.tournamentService.invalidateCache(`detail:${id}`);
                    this.tournamentService.invalidateCache('list');
                }
            });
        });

        this.hubConnection.on('RegistrationRejected', (tournamentDto: Tournament) => {
            this.ngZone.run(() => {
                const id = this.extractId(tournamentDto, 'id');
                if (id) {
                    const existing = this.tournamentStore.getTournamentById(id);
                    if (existing) {
                        this.tournamentStore.updateTournament({ ...existing, ...tournamentDto });
                    } else {
                        this.tournamentStore.upsertTournament(tournamentDto);
                    }
                    this.tournamentService.invalidateCache(`detail:${id}`);
                    this.tournamentService.invalidateCache('list');
                }
            });
        });

        this.hubConnection.on('RegistrationUpdated', (registrationDto: TournamentRegistration) => {
            this.ngZone.run(() => {
                const tournamentId = this.readValue<string>(registrationDto, 'tournamentId');
                if (tournamentId && registrationDto) {
                    this.tournamentStore.updateRegistration(tournamentId, registrationDto);
                    this.tournamentService.invalidateCache(`detail:${tournamentId}`);
                    this.tournamentService.invalidateCache('list');
                }
            });
        });

        this.hubConnection.on('MatchCreated', (dto: Match) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.matchStore.upsertMatch(dto);
                    const tid = this.readValue<string>(dto, 'tournamentId');
                    if (tid) this.matchService.invalidateCache(`tournament:${tid}`);
                }
            });
        });

        this.hubConnection.on('MatchUpdated', (dto: Match) => {
            this.ngZone.run(() => {
                const id = this.extractId(dto, 'id');
                if (id) {
                    // Merge: preserve events list stripped from slim payload
                    const existing = this.matchStore.getMatchById(id);
                    if (existing) {
                        this.matchStore.updateMatch({ ...existing, ...dto });
                    } else {
                        this.matchStore.upsertMatch(dto);
                    }
                    const tid = this.readValue<string>(dto, 'tournamentId');
                    if (tid) this.matchService.invalidateCache(`tournament:${tid}`);
                }
            });
        });

        this.hubConnection.on('MatchesGenerated', (dtos: Match[]) => {
            this.ngZone.run(() => {
                let tournamentId: string | null = null;
                (dtos || []).forEach(match => {
                    if (this.extractId(match, 'id')) {
                        this.matchStore.upsertMatch(match);
                        if (!tournamentId) tournamentId = this.readValue<string>(match, 'tournamentId');
                    }
                });
                if (tournamentId) this.matchService.invalidateCache(`tournament:${tournamentId}`);
            });
        });

        this.hubConnection.on('MatchDeleted', (payload: { matchId?: string; id?: string }) => {
            this.ngZone.run(() => {
                const matchId = this.extractId(payload, 'matchId');
                if (matchId) {
                    const existing = this.matchStore.getMatchById(matchId);
                    this.matchStore.removeMatch(matchId);
                    if (existing?.tournamentId) {
                        this.matchService.invalidateCache(`tournament:${existing.tournamentId}`);
                    }
                }
            });
        });

        this.hubConnection.on('TeamCreated', (dto: Team) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.teamStore.upsertTeam(dto);
                }
            });
        });

        this.hubConnection.on('TeamUpdated', (dto: Team) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.teamStore.upsertTeam(dto);
                    this.cascadeTeamUpdateToTournaments(dto);
                }
            });
        });

        this.hubConnection.on('TeamDeleted', (payload: { teamId?: string; id?: string }) => {
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

        this.hubConnection.on('RemovedFromTeam', (data: { teamId?: string; playerId?: string }) => {
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
                            teamRole: undefined
                        });
                    }

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.id === playerId) {
                        this.authService.clearTeamAssociation();
                    }
                }
            });
        });

        this.hubConnection.on('UserCreated', (dto: User) => {
            this.ngZone.run(() => {
                if (this.extractId(dto, 'id')) {
                    this.userStore.upsertUser(dto);
                }
            });
        });

        this.hubConnection.on('UserUpdated', (dto: User) => {
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

        this.hubConnection.on('UserDeleted', (payload: { userId?: string; id?: string }) => {
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

        this.hubConnection.on('AccountStatusChanged', (data: { userId?: string; status?: string }) => {
            this.ngZone.run(() => {
                const userId = this.readValue<string>(data, 'userId');
                const status = this.readValue<string>(data, 'status');
                if (userId && status) {
                    const user = this.userStore.getUserById(userId);
                    if (user) {
                        this.userStore.upsertUser({ ...user, status: status as UserStatus });
                    }

                    const currentUser = this.authService.getCurrentUser();
                    if (currentUser?.id === userId) {
                        this.authService.updateUserStatus(status);
                    }
                }
            });
        });



        this.hubConnection.on('SystemEvent', (event: SystemEvent) => {
            this.ngZone.run(() => {
                this.dispatch(event);
            });
        });
    }

    private handleCriticalActions(event: SystemEvent): boolean {
        const userId = this.readValue<string>(event.metadata, 'userId');
        const currentUser = this.authService.getCurrentUser();

        if (event.type === 'USER_BLOCKED' && currentUser && userId === currentUser.id) {
            this.uiFeedback.error('تم حظر حسابك', 'تم حظر حسابك بواسطة الإدارة. تواصل مع الدعم الفني إذا كنت تعتقد أن هذا خطأ.');
            setTimeout(() => {
                this.authService.logout();
            }, 1500);
            return true;
        }

        if (event.type === 'USER_APPROVED' && currentUser && userId === currentUser.id) {
            this.uiFeedback.success('تم تفعيل حسابك', 'حسابك الآن نشط وجاهز للاستخدام.');

            // Critical fix: Automatic token refresh to update JWT status/role claims
            this.authService.refreshToken().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: () => {
                    console.warn('JWT refreshed after account approval');
                    this.authService.refreshUserProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
                },
                error: () => this.authService.logout()
            });
            return true;
        }

        if (event.type === 'ADMIN_OVERRIDE') {
            const action = this.readValue<string>(event.metadata, 'action');
            this.uiFeedback.info('تنبيه أمني: تدخل إداري', `قام مسؤول آخر بتنفيذ إجراء: ${action}`);
            return false; // Don't block other listeners
        }

        return false;
    }

    private cascadeTeamUpdateToTournaments(team: Team): void {
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

                const captain = (team.players || []).find((p: Player) => p.teamRole === 'Captain');

                return {
                    ...registration,
                    teamName: team.name,
                    captainName: captain?.name || team.captainName || ''
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

        const players = (team.players || []).filter((player: Player) => {
            const id = String(player?.id || '');
            const userId = String(player?.userId || '');
            return id !== playerId && userId !== playerId;
        });

        this.teamStore.upsertTeam({
            ...team,
            players,
            playerCount: players.length
        });
    }

    private extractId(payload: unknown, preferredKey: string): string | null {
        if (!payload) {
            return null;
        }

        if (typeof payload === 'string') {
            return payload;
        }

        if (typeof payload === 'object') {
            const obj = payload as Record<string, unknown>;
            const preferred = this.readValue<string>(obj, preferredKey);
            if (preferred) {
                return preferred;
            }

            const generic = this.readValue<string>(obj, 'id');
            if (generic) {
                return generic;
            }
        }

        return null;
    }

    private readValue<T = unknown>(source: unknown, key: string): T | null {
        if (!source || typeof source !== 'object') {
            return null;
        }

        const obj = source as Record<string, unknown>;
        const camel = key;
        const pascal = key.charAt(0).toUpperCase() + key.slice(1);

        return (obj[camel] ?? obj[pascal] ?? null) as T | null;
    }
}

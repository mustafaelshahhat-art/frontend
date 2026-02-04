import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Team, Player, JoinRequest, MAX_TEAM_PLAYERS } from '../models/team.model';
import { User, UserRole } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    // Mock global players using IDs consistent with MatchService matches
    private allPlayers: Player[] = [
        // Team 1: النجوم
        { id: 'p1', displayId: 'USR-1001', name: 'أحمد محمد', goals: 8, assists: 5, yellowCards: 1, redCards: 0, teamId: 'team1', phone: '0550001001' },
        { id: 'p2', displayId: 'USR-1002', name: 'خالد سعد', goals: 5, assists: 7, yellowCards: 2, redCards: 0, teamId: 'team1', phone: '0550001002' },
        { id: 'p3', displayId: 'USR-1003', name: 'سعود عبدالله', goals: 0, assists: 0, yellowCards: 0, redCards: 0, teamId: 'team1', phone: '0550001003' },
        { id: 'p4', displayId: 'USR-1004', name: 'فهد محمد', goals: 1, assists: 0, yellowCards: 3, redCards: 1, teamId: 'team1', phone: '0550001004' },

        // Team 2: الصقور
        { id: 'p10', displayId: 'USR-2001', name: 'سالم الدوسري', goals: 3, assists: 2, yellowCards: 1, redCards: 0, teamId: 'team2', phone: '0550002001' },
        { id: 'p11', displayId: 'USR-2002', name: 'ياسر الشهراني', goals: 1, assists: 4, yellowCards: 0, redCards: 0, teamId: 'team2', phone: '0550002002' },
        { id: 'p12', displayId: 'USR-2003', name: 'سلمان الفرج', goals: 2, assists: 6, yellowCards: 1, redCards: 0, teamId: 'team2', phone: '0550002003' },

        // Team 3: الأمل
        { id: 'p20', displayId: 'USR-3001', name: 'علي البليهي', goals: 0, assists: 1, yellowCards: 4, redCards: 1, teamId: 'team3', phone: '0550003001' },
        { id: 'p21', displayId: 'USR-3002', name: 'محمد كنو', goals: 2, assists: 2, yellowCards: 2, redCards: 0, teamId: 'team3', phone: '0550003002' },

        // Team 4: القادسية
        { id: 'p30', displayId: 'USR-4001', name: 'عبدالرزاق حمدالله', goals: 10, assists: 3, yellowCards: 0, redCards: 0, teamId: 'team4', phone: '0550004001' },
    ];

    private mockTeams: Team[] = [
        {
            id: 'team1', name: 'النجوم', captainId: '3', captainName: 'أحمد المحمد',
            founded: '2020', players: [], joinRequests: []
        },
        {
            id: 'team2', name: 'الصقور', captainId: 'c2', captainName: 'سالم الدوسري',
            founded: '2021', players: [], joinRequests: []
        },
        {
            id: 'team3', name: 'الأمل', captainId: 'c3', captainName: 'علي البليهي',
            founded: '2022', players: [], joinRequests: []
        },
        {
            id: 'team4', name: 'القادسية', captainId: 'c4', captainName: 'عبدالرزاق',
            founded: '2019', players: [], joinRequests: []
        }
    ];

    constructor() {
        // Initialize players for all teams
        this.mockTeams.forEach(team => {
            team.players = this.allPlayers.filter(p => p.teamId === team.id);
        });
    }

    getTeamByCaptainId(captainId: string): Observable<Team | undefined> {
        const team = this.mockTeams.find(t => t.captainId === captainId);
        return of(team);
    }

    getTeamByPlayerId(playerId: string): Observable<Team | undefined> {
        const team = this.mockTeams.find(t => t.players.some(p => p.id === playerId));
        return of(team);
    }

    getTeamById(teamId: string): Observable<Team | undefined> {
        return of(this.mockTeams.find(t => t.id === teamId));
    }

    getAllTeams(): Observable<Team[]> {
        return of(this.mockTeams);
    }

    // ==================== CREATE TEAM ====================
    createTeam(user: User, teamName: string): Observable<{ team: Team, updatedUser: User }> {
        // Check if user is already a captain
        if (user.role === UserRole.CAPTAIN) {
            return throwError(() => new Error('أنت قائد فريق بالفعل ولا يمكنك إنشاء فريق آخر'));
        }
        // Check if user is already in a team
        if (user.teamId) {
            return throwError(() => new Error('أنت مسجل في فريق بالفعل. يجب مغادرة الفريق أولاً'));
        }

        const newTeam: Team = {
            id: `t${Date.now()}`,
            name: teamName,
            captainId: user.id,
            captainName: user.name,
            founded: new Date().getFullYear().toString(),
            players: [],
            joinRequests: []
        };
        this.mockTeams.push(newTeam);

        // Update user role and team
        const updatedUser: User = {
            ...user,
            role: UserRole.CAPTAIN,
            teamId: newTeam.id
        };

        // Persist updated user to localStorage
        localStorage.setItem('ramadan_user', JSON.stringify(updatedUser));

        return of({ team: newTeam, updatedUser });
    }

    // ==================== DELETE TEAM ====================
    deleteTeam(teamId: string, user: User): Observable<User> {
        const teamIndex = this.mockTeams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) {
            return throwError(() => new Error('الفريق غير موجود'));
        }
        const team = this.mockTeams[teamIndex];
        if (team.captainId !== user.id) {
            return throwError(() => new Error('لا يمكنك حذف فريق لست قائده'));
        }

        // Free all players
        team.players.forEach(p => {
            p.teamId = undefined;
            const globalPlayer = this.allPlayers.find(gp => gp.id === p.id);
            if (globalPlayer) globalPlayer.teamId = undefined;
        });

        // Remove team
        this.mockTeams.splice(teamIndex, 1);

        // Revert captain to player
        const updatedUser: User = {
            ...user,
            role: UserRole.PLAYER,
            teamId: undefined
        };
        localStorage.setItem('ramadan_user', JSON.stringify(updatedUser));

        return of(updatedUser);
    }

    // ==================== REQUEST TO JOIN ====================
    requestToJoinTeam(teamId: string, user: User): Observable<JoinRequest> {
        if (user.teamId) {
            return throwError(() => new Error('أنت مسجل في فريق بالفعل. لا يمكنك الانضمام لفريق آخر'));
        }
        if (user.role === UserRole.CAPTAIN) {
            return throwError(() => new Error('أنت قائد فريق ولا يمكنك الانضمام لفريق آخر'));
        }

        const team = this.mockTeams.find(t => t.id === teamId);
        if (!team) {
            return throwError(() => new Error('الفريق غير موجود'));
        }

        // Check team capacity (captain + players)
        if (team.players.length + 1 >= MAX_TEAM_PLAYERS) {
            return throwError(() => new Error(`الفريق اكتمل. الحد الأقصى ${MAX_TEAM_PLAYERS} لاعبين`));
        }

        // Check if already requested
        if (team.joinRequests.some(jr => jr.playerId === user.id && jr.status === 'pending')) {
            return throwError(() => new Error('لديك طلب معلق بالفعل لهذا الفريق'));
        }

        const request: JoinRequest = {
            id: `jr-${Date.now()}`,
            playerId: user.id,
            playerDisplayId: user.displayId,
            playerName: user.name,
            requestDate: new Date(),
            status: 'pending'
        };
        team.joinRequests.push(request);

        return of(request);
    }

    // ==================== RESPOND TO JOIN REQUEST ====================
    respondToJoinRequest(teamId: string, requestId: string, approve: boolean, captain: User): Observable<{ request: JoinRequest, player?: Player }> {
        const team = this.mockTeams.find(t => t.id === teamId);
        if (!team) {
            return throwError(() => new Error('الفريق غير موجود'));
        }
        if (team.captainId !== captain.id) {
            return throwError(() => new Error('لا يمكنك إدارة طلبات فريق لست قائده'));
        }

        const request = team.joinRequests.find(jr => jr.id === requestId);
        if (!request) {
            return throwError(() => new Error('الطلب غير موجود'));
        }

        if (approve) {
            // Check team capacity before approving
            if (team.players.length + 1 >= MAX_TEAM_PLAYERS) {
                return throwError(() => new Error(`لا يمكن قبول المزيد. الفريق اكتمل (${MAX_TEAM_PLAYERS} لاعبين)`));
            }

            request.status = 'approved';
            // Create new player from user data
            const newPlayer: Player = {
                id: request.playerId,
                displayId: request.playerDisplayId,
                name: request.playerName,
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                teamId: teamId,
                phone: '0500000000' // Placeholder
            };
            team.players.push(newPlayer);
            this.allPlayers.push(newPlayer);

            return of({ request, player: newPlayer });
        } else {
            request.status = 'rejected';
            return of({ request });
        }
    }

    // ==================== ADD PLAYER BY ID (Captain-initiated) ====================
    addPlayerByDisplayId(teamId: string, displayId: string, captain: User): Observable<Player> {
        const team = this.mockTeams.find(t => t.id === teamId);
        if (!team) {
            return throwError(() => new Error('الفريق غير موجود'));
        }
        if (team.captainId !== captain.id) {
            return throwError(() => new Error('لا يمكنك إضافة لاعبين لفريق لست قائده'));
        }

        // Check team capacity (captain + players)
        if (team.players.length + 1 >= MAX_TEAM_PLAYERS) {
            return throwError(() => new Error(`الفريق اكتمل. الحد الأقصى ${MAX_TEAM_PLAYERS} لاعبين (بما فيهم القائد)`));
        }

        const player = this.allPlayers.find(p => p.displayId === displayId);
        if (!player) {
            return throwError(() => new Error('اللاعب غير موجود بالنظام'));
        }
        if (player.teamId) {
            return throwError(() => new Error('اللاعب مسجل بالفعل في فريق آخر'));
        }
        if (player.id === captain.id) {
            return throwError(() => new Error('لا يمكنك إضافة نفسك كلاعب'));
        }

        player.teamId = teamId;
        team.players.push(player);

        return of(player);
    }

    // ==================== REMOVE PLAYER ====================
    removePlayer(teamId: string, playerId: string): Observable<boolean> {
        const team = this.mockTeams.find(t => t.id === teamId);
        if (team) {
            team.players = team.players.filter(p => p.id !== playerId);
            const player = this.allPlayers.find(p => p.id === playerId);
            if (player) player.teamId = undefined;
            return of(true);
        }
        return of(false);
    }

    // ==================== UPDATE TEAM ====================
    updateTeam(updatedTeam: Partial<Team>): Observable<Team> {
        const teamIndex = this.mockTeams.findIndex(t => t.id === updatedTeam.id);
        if (teamIndex > -1) {
            this.mockTeams[teamIndex] = { ...this.mockTeams[teamIndex], ...updatedTeam };
            return of(this.mockTeams[teamIndex]);
        }
        return throwError(() => new Error('الفريق غير موجود'));
    }
}

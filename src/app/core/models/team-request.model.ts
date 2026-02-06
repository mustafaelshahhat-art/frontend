export interface TeamJoinRequest {
    id: string;
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    status: 'pending' | 'approved' | 'rejected' | 'invite';
    requestDate: Date;
}

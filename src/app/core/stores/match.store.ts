import { Injectable, signal, computed } from '@angular/core';
import { Match, MatchStatus } from '../../core/models/tournament.model';
import { PagedResult } from '../../core/models/pagination.model';

export interface MatchState {
  matches: Match[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MatchStore {
  private state = signal<MatchState>({
    matches: [],
    isLoading: false,
    error: null
  });

  // Selectors
  matches = computed(() => this.state().matches);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Computed selectors for specific views
  upcomingMatches = computed(() =>
    this.matches().filter(m => m.status === MatchStatus.SCHEDULED)
  );

  ongoingMatches = computed(() =>
    this.matches().filter(m => m.status === MatchStatus.LIVE)
  );

  finishedMatches = computed(() =>
    this.matches().filter(m => m.status === MatchStatus.FINISHED)
  );

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setMatches(result: PagedResult<Match> | Match[]): void {
    const matches = Array.isArray(result) ? result : result.items;
    this.state.update(state => ({ ...state, matches, isLoading: false, error: null }));
  }

  addMatch(match: Match): void {
    this.state.update(state => ({
      ...state,
      matches: [...state.matches, match]
    }));
  }

  updateMatch(updatedMatch: Match): void {
    this.state.update(state => ({
      ...state,
      matches: state.matches.map(match =>
        match.id === updatedMatch.id ? updatedMatch : match
      )
    }));
  }

  upsertMatch(match: Match): void {
    const existing = this.getMatchById(match.id);
    if (existing) {
      this.updateMatch(match);
      return;
    }

    this.addMatch(match);
  }

  removeMatch(matchId: string): void {
    this.state.update(state => ({
      ...state,
      matches: state.matches.filter(match => match.id !== matchId)
    }));
  }

  removeMatchesByTournament(tournamentId: string): void {
    this.state.update(state => ({
      ...state,
      matches: state.matches.filter(match => match.tournamentId !== tournamentId)
    }));
  }

  clearTournamentMatches(tournamentId: string): void {
    this.removeMatchesByTournament(tournamentId);
  }

  removeMatchesByTeam(teamId: string): void {
    this.state.update(state => ({
      ...state,
      matches: state.matches.filter(match => match.homeTeamId !== teamId && match.awayTeamId !== teamId)
    }));
  }

  // Utility methods
  getMatchById(id: string): Match | undefined {
    return this.matches().find(match => match.id === id);
  }

  getMatchesByTournament(tournamentId: string): Match[] {
    return this.matches().filter(match => match.tournamentId === tournamentId);
  }


}

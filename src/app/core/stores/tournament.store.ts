import { Injectable, signal, computed } from '@angular/core';
import { Tournament, TournamentStatus, TeamRegistration } from '../../core/models/tournament.model';
import { PagedResult } from '../../core/models/pagination.model';

export interface TournamentState {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentStore {
  private state = signal<TournamentState>({
    tournaments: [],
    isLoading: false,
    error: null
  });

  // Selectors
  tournaments = computed(() => this.state().tournaments);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Computed selectors for specific views
  activeTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.ACTIVE)
  );

  upcomingTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.REGISTRATION_OPEN)
  );

  completedTournaments = computed(() =>
    this.tournaments().filter(t => t.status === TournamentStatus.COMPLETED)
  );

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setTournaments(result: PagedResult<Tournament> | Tournament[]): void {
    const tournaments = Array.isArray(result) ? result : result.items;
    this.state.update(state => ({ ...state, tournaments, isLoading: false, error: null }));
  }

  addTournament(tournament: Tournament): void {
    this.state.update(state => ({
      ...state,
      tournaments: [...state.tournaments, tournament]
    }));
  }

  updateTournament(updatedTournament: Tournament): void {
    this.state.update(state => ({
      ...state,
      tournaments: state.tournaments.map(tournament =>
        tournament.id === updatedTournament.id ? updatedTournament : tournament
      )
    }));
  }

  upsertTournament(tournament: Tournament): void {
    const existing = this.getTournamentById(tournament.id);
    if (existing) {
      this.updateTournament(tournament);
      return;
    }

    this.addTournament(tournament);
  }

  removeTournament(tournamentId: string): void {
    this.state.update(state => ({
      ...state,
      tournaments: state.tournaments.filter(tournament => tournament.id !== tournamentId)
    }));
  }

  updateRegistration(tournamentId: string, registration: TeamRegistration): void {
    this.state.update(state => ({
      ...state,
      tournaments: state.tournaments.map(tournament => {
        if (tournament.id !== tournamentId) {
          return tournament;
        }

        const existing = tournament.registrations || [];
        const updated = existing.some(r => r.teamId === registration.teamId)
          ? existing.map(r => (r.teamId === registration.teamId ? registration : r))
          : [...existing, registration];

        return { ...tournament, registrations: updated };
      })
    }));
  }

  removeTeamFromRegistrations(teamId: string): void {
    this.state.update(state => ({
      ...state,
      tournaments: state.tournaments.map(tournament => {
        const currentRegistrations = tournament.registrations || [];
        const filteredRegistrations = currentRegistrations.filter(reg => reg.teamId !== teamId);

        if (filteredRegistrations.length === currentRegistrations.length) {
          return tournament;
        }

        return {
          ...tournament,
          registrations: filteredRegistrations,
          currentTeams: filteredRegistrations.length
        };
      })
    }));
  }

  // Utility methods
  getTournamentById(id: string): Tournament | undefined {
    return this.tournaments().find(tournament => tournament.id === id);
  }

  getTournamentsByStatus(status: TournamentStatus): Tournament[] {
    return this.tournaments().filter(tournament => tournament.status === status);
  }
}

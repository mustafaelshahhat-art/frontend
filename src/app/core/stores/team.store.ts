import { Injectable, signal, computed } from '@angular/core';
import { Team } from '../../core/models/team.model';

export interface TeamState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TeamStore {
  private state = signal<TeamState>({
    teams: [],
    isLoading: false,
    error: null
  });

  // Selectors
  teams = computed(() => this.state().teams);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setTeams(teams: Team[]): void {
    this.state.update(state => ({ ...state, teams, isLoading: false, error: null }));
  }

  addTeam(team: Team): void {
    this.state.update(state => ({
      ...state,
      teams: [...state.teams, team]
    }));
  }

  updateTeam(updatedTeam: Team): void {
    this.state.update(state => ({
      ...state,
      teams: state.teams.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    }));
  }

  upsertTeam(team: Team): void {
    const existing = this.getTeamById(team.id);
    if (existing) {
      this.updateTeam(team);
      return;
    }

    this.addTeam(team);
  }

  removeTeam(teamId: string): void {
    this.state.update(state => ({
      ...state,
      teams: state.teams.filter(team => team.id !== teamId)
    }));
  }

  // Utility methods
  getTeamById(id: string): Team | undefined {
    return this.teams().find(team => team.id === id);
  }

  getTeamsByCaptain(captainId: string): Team[] {
    return this.teams().filter(team => team.captainId === captainId);
  }
}

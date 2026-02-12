import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../core/models/user.model';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private state = signal<AuthState>({
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });

  // Selectors
  currentUser = computed(() => this.state().currentUser);
  isAuthenticated = computed(() => this.state().isAuthenticated);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Computed selectors
  userRole = computed(() => this.currentUser()?.role);
  userId = computed(() => this.currentUser()?.id);
  userName = computed(() => this.currentUser()?.name);
  userTeamId = computed(() => this.currentUser()?.teamId);

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setCurrentUser(user: User | null): void {
    this.state.update(state => ({
      ...state,
      currentUser: user,
      isAuthenticated: !!user,
      isLoading: false,
      error: null
    }));
  }

  updateUser(updatedUser: User): void {
    this.state.update(state => ({
      ...state,
      currentUser: updatedUser
    }));
  }

  clearAuth(): void {
    this.state.update(() => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    }));
  }

  // Utility methods
  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isCaptain(): boolean {
    return !!this.currentUser()?.isTeamOwner;
  }

  isPlayer(): boolean {
    return this.hasRole('Player');
  }


}
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
  private static readonly USER_KEY = 'current_user';
  private static readonly TOKEN_KEY = 'auth_token';

  private state = signal<AuthState>(AuthStore.loadInitialState());

  /**
   * Hydrates auth state from localStorage on app startup so that
   * route guards see the correct authentication state before
   * AuthService (a lazy singleton) is instantiated.
   */
  private static loadInitialState(): AuthState {
    try {
      const userJson = localStorage.getItem(AuthStore.USER_KEY);
      const token = localStorage.getItem(AuthStore.TOKEN_KEY);

      if (userJson) {
        const user: User = JSON.parse(userJson);

        // Guest users don't have a JWT token
        if (user.id === 'guest') {
          return {
            currentUser: user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          };
        }

        // Regular users: verify the token exists and is not expired
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && Date.now() < payload.exp * 1000) {
            return {
              currentUser: user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            };
          }
        }
      }
    } catch {
      // If anything fails (corrupt data, invalid token), fall through to defaults
    }

    return {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    };
  }

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
  joinedTeamIds = computed(() => this.currentUser()?.joinedTeamIds || []);

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
    return this.currentUser()?.teamRole === 'Captain';
  }

  isPlayer(): boolean {
    return this.hasRole('Player');
  }


}
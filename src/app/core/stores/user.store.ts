import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole, UserStatus } from '../../core/models/user.model';

export interface UserState {
  users: User[];
  totalUserCount: number; // For dashboard/analytics summary
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserStore {
  private state = signal<UserState>({
    users: [],
    totalUserCount: 0,
    currentUser: null,
    isLoading: false,
    error: null
  });
  // Selectors
  users = computed(() => this.state().users);
  totalUserCount = computed(() => this.state().totalUserCount);
  currentUser = computed(() => this.state().currentUser);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);



  players = computed(() =>
    this.users().filter(u => u.role === UserRole.PLAYER && u.status === UserStatus.ACTIVE && u.isEmailVerified)
  );

  admins = computed(() =>
    this.users().filter(u => u.role === UserRole.ADMIN && u.isEmailVerified)
  );

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setUsers(users: User[]): void {
    this.state.update(state => ({
      ...state,
      users,
      totalUserCount: users.length,
      isLoading: false,
      error: null
    }));
  }

  setTotalUserCount(count: number): void {
    this.state.update(state => ({ ...state, totalUserCount: count }));
  }

  setCurrentUser(user: User | null): void {
    this.state.update(state => ({ ...state, currentUser: user }));
  }

  addUser(user: User): void {
    this.state.update(state => ({
      ...state,
      users: [...state.users, user]
    }));
  }

  updateUser(updatedUser: User): void {
    // Update in users list
    this.state.update(state => ({
      ...state,
      users: state.users.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    }));

    // Also update current user if it's the same
    if (this.currentUser()?.id === updatedUser.id) {
      this.setCurrentUser(updatedUser);
    }
  }

  upsertUser(user: User): void {
    const existing = this.getUserById(user.id);
    if (existing) {
      this.updateUser(user);
      return;
    }

    this.addUser(user);
  }

  removeUser(userId: string): void {
    this.state.update(state => ({
      ...state,
      users: state.users.filter(user => user.id !== userId)
    }));

    // Clear current user if it's the removed user
    if (this.currentUser()?.id === userId) {
      this.setCurrentUser(null);
    }
  }

  clearTeamMembership(teamId: string): void {
    this.state.update(state => ({
      ...state,
      users: state.users.map(user => {
        if (user.teamId !== teamId) {
          return user;
        }

        return {
          ...user,
          teamId: undefined,
          teamName: undefined,
          isTeamOwner: false
        };
      })
    }));
  }

  // Utility methods
  getUserById(id: string): User | undefined {
    return this.users().find(user => user.id === id);
  }

  getUsersByRole(role: UserRole): User[] {
    return this.users().filter(user => user.role === role);
  }

  getUsersByStatus(status: UserStatus): User[] {
    return this.users().filter(user => user.status === status);
  }


}

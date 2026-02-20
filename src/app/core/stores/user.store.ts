import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { PagedResult } from '../../core/models/pagination.model';

export interface UserState {
  users: User[];
  totalUserCount: number; // For dashboard/analytics summary
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
    isLoading: false,
    error: null
  });
  // Selectors
  users = computed(() => this.state().users);
  totalUserCount = computed(() => this.state().totalUserCount);
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

  setUsers(result: PagedResult<User> | User[]): void {
    const users = Array.isArray(result) ? result : result.items;
    const totalCount = Array.isArray(result) ? result.length : result.totalCount;
    this.state.update(state => ({
      ...state,
      users,
      totalUserCount: totalCount,
      isLoading: false,
      error: null
    }));
  }

  setTotalUserCount(count: number): void {
    this.state.update(state => ({ ...state, totalUserCount: count }));
  }

  addUser(user: User): void {
    this.state.update(state => ({
      ...state,
      users: [...state.users, user]
    }));
  }

  updateUser(updatedUser: User): void {
    this.state.update(state => ({
      ...state,
      users: state.users.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    }));
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
          teamRole: undefined
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

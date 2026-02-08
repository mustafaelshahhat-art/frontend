import { Injectable, signal, computed } from '@angular/core';

export interface StoreActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: Date;
}

export interface ActivityState {
  activities: StoreActivity[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityStore {
  private state = signal<ActivityState>({
    activities: [],
    isLoading: false,
    error: null
  });

  // Selectors
  activities = computed(() => this.state().activities);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Computed selectors for specific views
  recentActivities = computed(() => 
    this.activities().slice(0, 50) // Last 50 activities
  );

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setActivities(activities: StoreActivity[]): void {
    this.state.update(state => ({ ...state, activities, isLoading: false, error: null }));
  }

  addActivity(activity: StoreActivity): void {
    this.state.update(state => ({
      ...state,
      activities: [activity, ...state.activities]
    }));
  }

  addActivities(activities: StoreActivity[]): void {
    this.state.update(state => ({
      ...state,
      activities: [...activities, ...state.activities]
    }));
  }

  removeActivity(activityId: string): void {
    this.state.update(state => ({
      ...state,
      activities: state.activities.filter(activity => activity.id !== activityId)
    }));
  }

  // Utility methods
  getActivityById(id: string): StoreActivity | undefined {
    return this.activities().find(activity => activity.id === id);
  }

  getActivitiesByUser(userId: string): StoreActivity[] {
    return this.activities().filter(activity => activity.userId === userId);
  }

  getActivitiesByEntity(entityType: string, entityId: string): StoreActivity[] {
    return this.activities().filter(activity => 
      activity.entityType === entityType && activity.entityId === entityId
    );
  }
}
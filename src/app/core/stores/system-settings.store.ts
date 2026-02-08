import { Injectable, signal, computed } from '@angular/core';
import { SystemSettings } from '../services/system-settings.service';

export interface SystemSettingsState {
  settings: SystemSettings | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SystemSettingsStore {
  private state = signal<SystemSettingsState>({
    settings: null,
    isLoading: false,
    error: null
  });

  // Selectors
  settings = computed(() => this.state().settings);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);
  
  // Computed properties
  allowTeamCreation = computed(() => this.settings()?.allowTeamCreation ?? true);
  maintenanceMode = computed(() => this.settings()?.maintenanceMode ?? false);

  // Mutations
  setLoading(loading: boolean): void {
    this.state.update(state => ({ ...state, isLoading: loading }));
  }

  setError(error: string | null): void {
    this.state.update(state => ({ ...state, error }));
  }

  setSettings(settings: SystemSettings): void {
    this.state.update(state => ({ 
      ...state, 
      settings, 
      isLoading: false, 
      error: null 
    }));
  }

  updateSettings(updates: Partial<SystemSettings>): void {
    this.state.update(state => ({
      ...state,
      settings: state.settings ? { ...state.settings, ...updates } : null
    }));
  }
}
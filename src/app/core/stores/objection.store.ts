import { signal, computed } from '@angular/core';
import { Objection } from '../models/objection.model';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ObjectionStore {
    private _objections = signal<Objection[]>([]);
    private _isLoading = signal<boolean>(false);
    private _error = signal<string | null>(null);

    // Selectors
    objections = computed(() => this._objections());
    isLoading = computed(() => this._isLoading());
    error = computed(() => this._error());

    // Actions
    setObjections(objections: Objection[]) {
        this._objections.set(objections);
    }

    upsertObjection(objection: Objection) {
        const current = this._objections();
        const index = current.findIndex(o => o.id === objection.id);

        if (index !== -1) {
            const updated = [...current];
            updated[index] = objection;
            this._objections.set(updated);
        } else {
            this._objections.set([objection, ...current]);
        }
    }

    setLoading(isLoading: boolean) {
        this._isLoading.set(isLoading);
    }

    setError(error: string | null) {
        this._error.set(error);
    }
}

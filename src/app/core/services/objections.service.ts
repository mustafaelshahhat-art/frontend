import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Objection, ObjectionStatus } from '../models/objection.model';

@Injectable({
    providedIn: 'root'
})
export class ObjectionsService {
    private readonly http = inject(HttpClient);
    // TODO: Define actual API base URL
    private readonly apiUrl = 'api/objections';

    getObjections(): Observable<Objection[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getObjectionById(id: string): Observable<Objection | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getObjectionsByTeam(teamId: string): Observable<Objection[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    getObjectionsByStatus(status: ObjectionStatus): Observable<Objection[]> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    submitObjection(objection: Partial<Objection>): Observable<Objection> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    approveObjection(id: string, notes?: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    rejectObjection(id: string, notes?: string): Observable<boolean> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }

    updateObjectionStatus(id: string, status: ObjectionStatus, notes?: string): Observable<Objection | undefined> {
        // TODO: Implement backend endpoint
        return throwError(() => new Error('Endpoint not implemented'));
    }
}


import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Objection, ObjectionStatus } from '../models/objection.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ObjectionsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/Objections`;

    getObjections(): Observable<Objection[]> {
        return this.http.get<Objection[]>(this.apiUrl);
    }

    getObjectionById(id: string): Observable<Objection> {
        return this.http.get<Objection>(`${this.apiUrl}/${id}`);
    }

    submitObjection(objection: { matchId: string, type: string, description: string }): Observable<Objection> {
        return this.http.post<Objection>(this.apiUrl, objection);
    }

    approveObjection(id: string, notes?: string): Observable<Objection> {
        return this.http.post<Objection>(`${this.apiUrl}/${id}/resolve`, { approved: true, notes });
    }

    rejectObjection(id: string, notes?: string): Observable<Objection> {
        return this.http.post<Objection>(`${this.apiUrl}/${id}/resolve`, { approved: false, notes });
    }

    updateObjectionStatus(id: string, status: ObjectionStatus, notes?: string): Observable<Objection> {
        if (status === ObjectionStatus.APPROVED) {
            return this.approveObjection(id, notes);
        } else {
            return this.rejectObjection(id, notes);
        }
    }

    // Filters handled locally for now or we could add backend params
    getObjectionsByTeam(teamId: string): Observable<Objection[]> {
        return this.getObjections().pipe(
            map(obs => obs.filter(o => o.teamId === teamId))
        );
    }

    getObjectionsByStatus(status: ObjectionStatus): Observable<Objection[]> {
        return this.getObjections().pipe(
            map(obs => obs.filter(o => o.status === status))
        );
    }
}

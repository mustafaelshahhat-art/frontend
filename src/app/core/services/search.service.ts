import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
    id: string;
    type: 'tournament' | 'match' | 'team' | 'user';
    title: string;
    subtitle?: string;
    icon: string;
    route: string;
}

export interface SearchResponse {
    results: SearchResult[];
    totalCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/search`;

    private searchQuery$ = new BehaviorSubject<string>('');
    private isSearching$ = new BehaviorSubject<boolean>(false);
    private searchResults$ = new BehaviorSubject<SearchResult[]>([]);

    get isSearching(): Observable<boolean> {
        return this.isSearching$.asObservable();
    }

    get searchResults(): Observable<SearchResult[]> {
        return this.searchResults$.asObservable();
    }

    constructor() {
        this.searchQuery$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                if (!query || query.trim().length < 2) {
                    return of({ results: [], totalCount: 0 } as SearchResponse);
                }
                this.isSearching$.next(true);
                return this.performSearch(query);
            })
        ).subscribe({
            next: (response) => {
                this.searchResults$.next(response.results);
                this.isSearching$.next(false);
            },
            error: () => {
                this.searchResults$.next([]);
                this.isSearching$.next(false);
            }
        });
    }

    search(query: string): void {
        this.searchQuery$.next(query);
    }

    clearSearch(): void {
        this.searchQuery$.next('');
        this.searchResults$.next([]);
    }

    private performSearch(query: string): Observable<SearchResponse> {
        return this.http.get<SearchResponse>(this.apiUrl, {
            params: { q: query }
        });
    }
}

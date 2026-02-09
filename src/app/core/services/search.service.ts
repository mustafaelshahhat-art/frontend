import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, debounceTime, distinctUntilChanged, switchMap, of, map, shareReplay, finalize, catchError } from 'rxjs';
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

    private readonly searchQuery$ = new BehaviorSubject<string>('');
    private readonly isSearchingSubject$ = new BehaviorSubject<boolean>(false);

    public readonly isSearching$: Observable<boolean> = this.isSearchingSubject$.asObservable();

    public readonly searchResults$: Observable<SearchResult[]> = this.searchQuery$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
            if (!query || query.trim().length < 2) {
                return of({ results: [], totalCount: 0 } as SearchResponse);
            }
            this.isSearchingSubject$.next(true);
            return this.performSearch(query).pipe(
                catchError(() => of({ results: [], totalCount: 0 } as SearchResponse)),
                finalize(() => this.isSearchingSubject$.next(false))
            );
        }),
        map(response => response.results),
        shareReplay(1)
    );

    get isSearching(): Observable<boolean> {
        return this.isSearching$;
    }

    get searchResults(): Observable<SearchResult[]> {
        return this.searchResults$;
    }

    search(query: string): void {
        this.searchQuery$.next(query);
    }

    clearSearch(): void {
        this.searchQuery$.next('');
    }

    private performSearch(query: string): Observable<SearchResponse> {
        return this.http.get<SearchResponse>(this.apiUrl, {
            params: { q: query }
        });
    }
}

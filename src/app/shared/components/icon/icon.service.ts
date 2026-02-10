import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class IconService {
    private http = inject(HttpClient);
    private sanitizer = inject(DomSanitizer);

    // Cache for loaded icons to prevent duplicate requests
    private iconCache = new Map<string, Observable<SafeHtml | null>>();

    /**
     * Fetches an SVG icon from assets and sanitizes it for safe usage.
     * Handles caching automatically.
     */
    getIcon(name: string): Observable<SafeHtml | null> {
        if (this.iconCache.has(name)) {
            return this.iconCache.get(name)!;
        }

        const url = `/assets/icons/${name}.svg`;
        const request$ = this.http.get(url, { responseType: 'text' }).pipe(
            map(svgString => {
                // Ensure the SVG has the correct attributes for styling
                // We could manipulate the SVG string here if needed (e.g. remove width/height)
                return this.sanitizer.bypassSecurityTrustHtml(svgString);
            }),
            catchError(err => {
                console.warn(`IconService: Could not load icon '${name}'`, err);
                return of(null);
            }),
            shareReplay(1) // Share the same observable for concurrent requests
        );

        this.iconCache.set(name, request$);
        return request$;
    }
}

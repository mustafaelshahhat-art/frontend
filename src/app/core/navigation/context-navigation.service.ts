import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class ContextNavigationService {
    private readonly router = inject(Router);

    /**
     * Detects the current root prefix (admin, captain, player) from the URL.
     * Returns the prefix with a leading slash, e.g., '/admin'.
     */
    getRootPrefix(): string {
        const url = this.router.url;
        const segments = url.split('/');

        // We expect the first or second segment to be one of our roles
        // URL format is usually /admin/... or /...
        const roles = ['admin', 'captain', 'player'];

        // Check for the first non-empty segment
        const role = segments.find(s => roles.includes(s));

        return role ? `/${role}` : '';
    }

    /**
     * Navigates to a path within the current context.
     * @param path The path to navigate to (without the root prefix).
     * @param extras Optional navigation extras.
     */
    navigateTo(path: string | string[], extras?: any): void {
        const prefix = this.getRootPrefix();

        if (Array.isArray(path)) {
            // Remove leading slash from the first element of path if present
            const firstPath = path[0].startsWith('/') ? path[0].substring(1) : path[0];
            const cleanPath = [firstPath, ...path.slice(1)];

            // If prefix exists and path doesn't already start with it
            if (prefix && !path[0].startsWith(prefix)) {
                this.router.navigate([prefix, ...cleanPath], extras);
            } else {
                this.router.navigate(path, extras);
            }
        } else {
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            if (prefix && !path.startsWith(prefix)) {
                this.router.navigate([`${prefix}/${cleanPath}`], extras);
            } else {
                this.router.navigate([path], extras);
            }
        }
    }

    /**
     * Navigates back to a fallback path within the current context.
     * Handles history when possible, otherwise uses the fallback.
     */
    navigateBack(fallback: string): void {
        // Simple implementation for now: navigate to fallback within context
        // Could be enhanced with Location service to check history
        this.navigateTo(fallback);
    }
}

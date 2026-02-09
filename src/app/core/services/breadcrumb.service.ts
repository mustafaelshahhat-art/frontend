import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Observable, filter, map, startWith, shareReplay } from 'rxjs';

export interface Breadcrumb {
    label: string;
    url: string;
    icon?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbService {
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

    public readonly breadcrumbs$: Observable<Breadcrumb[]> = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null), // Trigger initially
        map(() => this.buildBreadcrumbs(this.activatedRoute.root)),
        shareReplay(1)
    );

    get breadcrumbs(): Observable<Breadcrumb[]> {
        return this.breadcrumbs$;
    }

    private buildBreadcrumbs(route: ActivatedRoute, url = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
        const children = route.children;

        if (children.length === 0) {
            return breadcrumbs;
        }

        for (const child of children) {
            if (!child || !child.snapshot) {
                continue;
            }
            const routeURL = child.snapshot.url.map(segment => segment.path).join('/');
            if (routeURL !== '') {
                url += `/${routeURL}`;
            }

            const label = child.snapshot.data['breadcrumb'];
            const icon = child.snapshot.data['icon'];

            if (label) {
                breadcrumbs.push({ label, url, icon });
            }

            return this.buildBreadcrumbs(child, url, breadcrumbs);
        }

        return breadcrumbs;
    }
}

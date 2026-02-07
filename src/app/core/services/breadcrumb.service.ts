import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, filter } from 'rxjs';

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

    private breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);

    get breadcrumbs(): Observable<Breadcrumb[]> {
        return this.breadcrumbs$.asObservable();
    }

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            const breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
            this.breadcrumbs$.next(breadcrumbs);
        });
    }

    private buildBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
        const children = route.children;

        if (children.length === 0) {
            return breadcrumbs;
        }

        for (const child of children) {
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

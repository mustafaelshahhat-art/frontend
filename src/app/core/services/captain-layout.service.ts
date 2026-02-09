import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CaptainLayoutService {
    // Page Metadata
    readonly title = signal<string>('');
    readonly subtitle = signal<string>('');

    // Layout Slots
    readonly actionsTemplate = signal<TemplateRef<any> | null>(null);
    readonly filtersTemplate = signal<TemplateRef<any> | null>(null);

    constructor() { }

    setTitle(title: string): void {
        this.title.set(title);
    }

    setSubtitle(subtitle: string): void {
        this.subtitle.set(subtitle);
    }

    setActions(template: TemplateRef<any> | null): void {
        this.actionsTemplate.set(template);
    }

    setFilters(template: TemplateRef<any> | null): void {
        this.filtersTemplate.set(template);
    }

    // Helper to reset all (optional, can be called on navigation end)
    reset(): void {
        this.title.set('');
        this.subtitle.set('');
        this.actionsTemplate.set(null);
        this.filtersTemplate.set(null);
    }
}

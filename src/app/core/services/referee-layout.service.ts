import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class RefereeLayoutService {
    // Page Metadata
    readonly title = signal<string>('');
    readonly subtitle = signal<string>('');
    readonly showBack = signal<boolean>(false);
    readonly backAction = signal<(() => void) | null>(null);

    // Layout Slots
    readonly actionsTemplate = signal<TemplateRef<unknown> | null>(null);
    readonly filtersTemplate = signal<TemplateRef<unknown> | null>(null);




    setTitle(title: string): void {
        this.title.set(title);
    }

    setSubtitle(subtitle: string): void {
        this.subtitle.set(subtitle);
    }

    setBackAction(action: (() => void) | null): void {
        this.showBack.set(!!action);
        this.backAction.set(action);
    }

    setShowBack(show: boolean): void {
        this.showBack.set(show);
    }

    onBack(): void {
        const action = this.backAction();
        if (action) {
            action();
        }
    }

    setActions(template: TemplateRef<unknown> | null): void {
        this.actionsTemplate.set(template);
    }

    setFilters(template: TemplateRef<unknown> | null): void {
        this.filtersTemplate.set(template);
    }

    // Helper to reset all (optional, can be called on navigation end)
    reset(): void {
        this.title.set('');
        this.subtitle.set('');
        this.showBack.set(false);
        this.backAction.set(null);
        this.actionsTemplate.set(null);
        this.filtersTemplate.set(null);
    }
}

import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LayoutOrchestratorService {
    // Page Metadata
    readonly title = signal<string>('');
    readonly subtitle = signal<string>('');
    readonly showBack = signal<boolean>(false);
    readonly backAction = signal<(() => void) | null>(null);

    // Layout Slots
    readonly actionsTemplate = signal<TemplateRef<unknown> | null>(null);
    readonly filtersTemplate = signal<TemplateRef<unknown> | null>(null);

    // Direct action handler (alternative to templates)
    readonly actionHandler = signal<(() => void) | null>(null);
    readonly actionLabel = signal<string>('');
    readonly actionIcon = signal<string>('add');

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

    setActionHandler(handler: (() => void) | null, label = '', icon = 'add'): void {
        this.actionHandler.set(handler);
        this.actionLabel.set(label);
        this.actionIcon.set(icon);
    }

    // Custom template to be rendered next to the title (e.g. badges, status indicators)
    readonly titleAddonTemplate = signal<TemplateRef<unknown> | null>(null);

    setTitleAddon(template: TemplateRef<unknown> | null): void {
        this.titleAddonTemplate.set(template);
    }

    reset(): void {
        this.title.set('');
        this.subtitle.set('');
        this.showBack.set(false);
        this.backAction.set(null);
        this.actionsTemplate.set(null);
        this.filtersTemplate.set(null);
        this.actionHandler.set(null);
        this.actionLabel.set('');
        this.actionIcon.set('add');
        this.titleAddonTemplate.set(null);
    }
}

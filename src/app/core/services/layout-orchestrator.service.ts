import { Injectable, inject, TemplateRef } from '@angular/core';
import { AdminLayoutService } from './admin-layout.service';
import { CaptainLayoutService } from './captain-layout.service';
import { RefereeLayoutService } from './referee-layout.service';

@Injectable({
    providedIn: 'root'
})
export class LayoutOrchestratorService {
    private adminLayout = inject(AdminLayoutService);
    private captainLayout = inject(CaptainLayoutService);
    private refereeLayout = inject(RefereeLayoutService);

    setTitle(title: string): void {
        this.adminLayout.setTitle(title);
        this.captainLayout.setTitle(title);
        this.refereeLayout.setTitle(title);
    }

    setSubtitle(subtitle: string): void {
        this.adminLayout.setSubtitle(subtitle);
        this.captainLayout.setSubtitle(subtitle);
        this.refereeLayout.setSubtitle(subtitle);
    }

    setBackAction(action: (() => void) | null): void {
        this.adminLayout.setBackAction(action);
        this.captainLayout.setBackAction(action);
        this.refereeLayout.setBackAction(action);
    }

    setShowBack(show: boolean): void {
        this.adminLayout.setShowBack(show);
        this.captainLayout.setShowBack(show);
        this.refereeLayout.setShowBack(show);
    }

    setActions(template: TemplateRef<unknown> | null): void {
        this.adminLayout.setActions(template);
        this.captainLayout.setActions(template);
        this.refereeLayout.setActions(template);
    }

    setFilters(template: TemplateRef<unknown> | null): void {
        this.adminLayout.setFilters(template);
        this.captainLayout.setFilters(template);
        this.refereeLayout.setFilters(template);
    }

    setActionHandler(handler: (() => void) | null): void {
        this.captainLayout.setActionHandler(handler);
    }

    reset(): void {
        this.adminLayout.reset();
        this.captainLayout.reset();
        this.refereeLayout.reset();
    }
}

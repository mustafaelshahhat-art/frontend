import { Injectable, inject, TemplateRef } from '@angular/core';
import { AdminLayoutService } from './admin-layout.service';
import { CaptainLayoutService } from './captain-layout.service';
import { TournamentCreatorLayoutService } from './tournament-creator-layout.service';


@Injectable({
    providedIn: 'root'
})
export class LayoutOrchestratorService {
    private adminLayout = inject(AdminLayoutService);
    private captainLayout = inject(CaptainLayoutService);
    private creatorLayout = inject(TournamentCreatorLayoutService);


    setTitle(title: string): void {
        this.adminLayout.setTitle(title);
        this.captainLayout.setTitle(title);
        this.creatorLayout.setTitle(title);
    }

    setSubtitle(subtitle: string): void {
        this.adminLayout.setSubtitle(subtitle);
        this.captainLayout.setSubtitle(subtitle);
        this.creatorLayout.setSubtitle(subtitle);
    }

    setBackAction(action: (() => void) | null): void {
        this.adminLayout.setBackAction(action);
        this.captainLayout.setBackAction(action);
        this.creatorLayout.setBackAction(action);
    }

    setShowBack(show: boolean): void {
        this.adminLayout.setShowBack(show);
        this.captainLayout.setShowBack(show);
        this.creatorLayout.setShowBack(show);
    }

    setActions(template: TemplateRef<unknown> | null): void {
        this.adminLayout.setActions(template);
        this.captainLayout.setActions(template);
        this.creatorLayout.setActions(template);
    }

    setFilters(template: TemplateRef<unknown> | null): void {
        this.adminLayout.setFilters(template);
        this.captainLayout.setFilters(template);
        this.creatorLayout.setFilters(template);
    }

    setActionHandler(handler: (() => void) | null): void {
        this.captainLayout.setActionHandler(handler);
    }

    reset(): void {
        this.adminLayout.reset();
        this.captainLayout.reset();
        this.creatorLayout.reset();
    }
}

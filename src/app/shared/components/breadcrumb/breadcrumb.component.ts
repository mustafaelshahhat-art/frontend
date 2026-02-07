import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreadcrumbService, Breadcrumb } from '../../../core/services/breadcrumb.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <nav class="breadcrumb-nav" *ngIf="breadcrumbs().length > 0">
            <ol class="breadcrumb-list">
                <li *ngFor="let crumb of breadcrumbs(); let last = last" class="breadcrumb-item">
                    <a *ngIf="!last" [routerLink]="crumb.url" class="breadcrumb-link">
                        <span *ngIf="crumb.icon" class="material-symbols-outlined breadcrumb-icon">{{ crumb.icon }}</span>
                        {{ crumb.label }}
                    </a>
                    <span *ngIf="last" class="breadcrumb-current">
                        <span *ngIf="crumb.icon" class="material-symbols-outlined breadcrumb-icon">{{ crumb.icon }}</span>
                        {{ crumb.label }}
                    </span>
                    <span *ngIf="!last" class="breadcrumb-separator">/</span>
                </li>
            </ol>
        </nav>
    `,
    styles: [`
        .breadcrumb-nav {
            display: flex;
            align-items: center;
        }

        .breadcrumb-list {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .breadcrumb-item {
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .breadcrumb-link {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            color: var(--text-muted);
            font-size: var(--text-sm);
            text-decoration: none;
            transition: var(--transition-fast);

            &:hover {
                color: var(--color-primary);
            }
        }

        .breadcrumb-current {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            color: var(--text-primary);
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
        }

        .breadcrumb-icon {
            font-size: 16px;
        }

        .breadcrumb-separator {
            color: var(--text-muted);
            opacity: 0.5;
        }
    `]
})
export class BreadcrumbComponent {
    private breadcrumbService = inject(BreadcrumbService);
    breadcrumbs = toSignal(this.breadcrumbService.breadcrumbs, { initialValue: [] as Breadcrumb[] });
}

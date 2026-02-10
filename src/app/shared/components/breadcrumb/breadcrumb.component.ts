import { IconComponent } from '../icon/icon.component';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreadcrumbService, Breadcrumb } from '../../../core/services/breadcrumb.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [IconComponent, CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (breadcrumbs().length > 0) {
            <nav class="breadcrumb-nav">
                <ol class="breadcrumb-list">
                    @for (crumb of breadcrumbs(); track crumb.url; let last = $last) {
                        <li class="breadcrumb-item">
                            @if (!last) {
                                <a [routerLink]="crumb.url" class="breadcrumb-link">
                                    @if (crumb.icon) {
                                        <app-icon [name]=" crumb.icon " class="breadcrumb-icon icon-sm"></app-icon>
                                    }
                                    {{ crumb.label }}
                                </a>
                            } @else {
                                <span class="breadcrumb-current">
                                    @if (crumb.icon) {
                                        <app-icon [name]=" crumb.icon " class="breadcrumb-icon icon-sm"></app-icon>
                                    }
                                    {{ crumb.label }}
                                </span>
                            }
                            @if (!last) {
                                <span class="breadcrumb-separator">/</span>
                            }
                        </li>
                    }
                </ol>
            </nav>
        }
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

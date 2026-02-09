import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * InlineLoadingComponent - A standalone inline spinner for loading states.
 * Use this for section-level loading (not full-page overlay).
 * 
 * Usage:
 *   <app-inline-loading message="جاري التحميل..."></app-inline-loading>
 */
@Component({
    selector: 'app-inline-loading',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './inline-loading.component.html',
    styleUrls: ['./inline-loading.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineLoadingComponent {
    @Input() message = 'جاري التحميل...';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
}

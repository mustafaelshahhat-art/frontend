import { IconComponent } from '../icon/icon.component';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * A single selectable filter option.
 */
export interface FilterItem {
    label?: string;
    value?: unknown;
    icon?: string;
    [key: string]: unknown;
}

/**
 * Accessible segmented-control filter.
 *
 * - Desktop  (>=992px): horizontal pill bar
 * - Tablet   (768-991): wrapping horizontal pills
 * - Mobile   (<768px) : 2-column grid, icon stacked above label
 *
 * Pure presentational. OnPush. No subscriptions. No side-effects.
 */
@Component({
    selector: 'app-filter',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterComponent {
    @Input() items: FilterItem[] = [];
    @Input() activeValue: unknown;
    @Input() valueKey = 'value';
    @Input() labelKey = 'label';
    @Input() ariaLabel = 'عوامل التصفية';
    @Output() filterChange = new EventEmitter<unknown>();

    getValue(item: FilterItem): unknown {
        return item[this.valueKey] ?? item.value;
    }

    getLabel(item: FilterItem): string {
        return (item[this.labelKey] ?? item.label) as string;
    }

    isActive(item: FilterItem): boolean {
        return this.activeValue === this.getValue(item);
    }

    onSelect(value: unknown): void {
        this.filterChange.emit(value);
    }

    trackByValue(_index: number, item: FilterItem): unknown {
        return item[this.valueKey] ?? item.value ?? _index;
    }
}

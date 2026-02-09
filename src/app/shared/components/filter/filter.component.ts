import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface representing a single choice in the filter component.
 * We use any here to allow for various specific types (unions, strings, numbers)
 * in components that implement this filter.
 */
export interface FilterItem {
    label: string;
    value: unknown;
    icon?: string;
}

@Component({
    selector: 'app-filter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterComponent {
    @Input() items: FilterItem[] = [];
    @Input() activeValue: unknown;
    @Output() filterChange = new EventEmitter<unknown>();

    onSelect(value: unknown): void {
        this.filterChange.emit(value);
    }
}

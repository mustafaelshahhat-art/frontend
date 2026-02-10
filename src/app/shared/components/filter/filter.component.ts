import { IconComponent } from '../icon/icon.component';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface representing a single choice in the filter component.
 * We use any here to allow for various specific types (unions, strings, numbers)
 * in components that implement this filter.
 */
export interface FilterItem {
    label?: string;
    value?: unknown;
    icon?: string;
    [key: string]: any;
}

@Component({
    selector: 'app-filter',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterComponent {
    @Input() items: any[] = [];
    @Input() activeValue: unknown;
    @Input() valueKey = 'value';
    @Input() labelKey = 'label';
    @Output() filterChange = new EventEmitter<unknown>();

    getValue(item: any): unknown {
        return item[this.valueKey] ?? item.value;
    }

    getLabel(item: any): string {
        return item[this.labelKey] ?? item.label;
    }

    onSelect(value: unknown): void {
        this.filterChange.emit(value);
    }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilterItem {
    label: string;
    value: any;
    icon?: string;
}

@Component({
    selector: 'app-filter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss']
})
export class FilterComponent {
    @Input() items: FilterItem[] = [];
    @Input() activeValue: any;
    @Output() change = new EventEmitter<any>();

    onSelect(value: any): void {
        this.change.emit(value);
    }
}

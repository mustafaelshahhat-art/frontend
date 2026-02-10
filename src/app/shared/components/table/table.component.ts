import { IconComponent } from '../icon/icon.component';
import { Component, Input, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
    key: string;
    label: string;
    width?: string;
    template?: TemplateRef<unknown>;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
}

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent {
    @Input() data: unknown[] = [];
    @Input() columns: TableColumn[] = [];
    @Input() loading = false;
    @Input() emptyMessage = 'No data available';
    @Input() hoverable = true;
    @Input() striped = false;

    getCellValue(row: unknown, key: string): unknown {
        return key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)?.[k], row);
    }
}

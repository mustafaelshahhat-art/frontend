import { Component, Input, TemplateRef, ContentChild, Directive } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
    key: string;
    label: string;
    width?: string;
    template?: TemplateRef<any>;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
}

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
})
export class TableComponent {
    @Input() data: any[] = [];
    @Input() columns: TableColumn[] = [];
    @Input() loading = false;
    @Input() emptyMessage = 'No data available';
    @Input() hoverable = true;
    @Input() striped = false;

    getCellValue(row: any, key: string): any {
        return key.split('.').reduce((obj, k) => obj && obj[k], row);
    }
}

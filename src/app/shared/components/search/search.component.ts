import { IconComponent } from '../icon/icon.component';
import { Component, Input, Output, EventEmitter, inject, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchResult } from '../../../core/services/search.service';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [IconComponent, CommonModule, FormsModule],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
    private elementRef = inject(ElementRef);

    @Input() placeholder = 'البحث...';
    @Input() value = '';
    @Input() results: SearchResult[] = [];
    @Input() searching = false;

    @Output() searchChange = new EventEmitter<string>();
    @Output() resultSelected = new EventEmitter<SearchResult>();
    @Output() cleared = new EventEmitter<void>();

    showDropdown = false;

    onInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.value;
        this.searchChange.emit(this.value);
        this.showDropdown = this.value.length >= 2;
    }

    onFocus(): void {
        if (this.value.length >= 2) {
            this.showDropdown = true;
        }
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.showDropdown = false;
        }
    }

    selectResult(result: SearchResult): void {
        this.resultSelected.emit(result);
        this.showDropdown = false;
        this.value = '';
    }

    clearSearch(): void {
        this.value = '';
        this.cleared.emit();
        this.showDropdown = false;
    }

    getTypeLabel(type: string): string {
        switch (type) {
            case 'tournament': return 'بطولة';
            case 'match': return 'مباراة';
            case 'team': return 'فريق';
            default: return 'مستخدم';
        }
    }
}

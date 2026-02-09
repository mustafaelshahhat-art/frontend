import { Component, Input, Output, EventEmitter, inject, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchService, SearchResult } from '../../../core/services/search.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
    private searchService = inject(SearchService);
    private router = inject(Router);
    private elementRef = inject(ElementRef);

    @Input() placeholder = 'البحث...';
    @Input() value = '';

    @Output() searchChange = new EventEmitter<string>();

    searchResults = toSignal(this.searchService.searchResults, { initialValue: [] as SearchResult[] });
    isSearching = toSignal(this.searchService.isSearching, { initialValue: false });
    showDropdown = false;

    onInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.value;
        this.searchChange.emit(this.value);
        this.searchService.search(this.value);
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

    navigateToResult(result: SearchResult): void {
        this.router.navigate([result.route]);
        this.showDropdown = false;
        this.value = '';
        this.searchService.clearSearch();
    }

    clearSearch(): void {
        this.value = '';
        this.searchService.clearSearch();
        this.showDropdown = false;
    }
}

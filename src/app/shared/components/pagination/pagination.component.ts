import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

/**
 * Shared pagination controls for standard page-switching.
 *
 * Usage:
 * ```html
 * <app-pagination
 *   [pageNumber]="pager.pageNumber"
 *   [totalPages]="pager.totalPages"
 *   [hasPreviousPage]="pager.hasPreviousPage"
 *   [hasNextPage]="pager.hasNextPage"
 *   [summary]="pager.summary"
 *   (pageChange)="pager.loadPage($event)" />
 * ```
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  /** Current page number (1-based). Accepts a Signal or static value. */
  @Input({ required: true }) pageNumber!: Signal<number> | number;
  @Input({ required: true }) totalPages!: Signal<number> | number;
  @Input({ required: true }) hasPreviousPage!: Signal<boolean> | boolean;
  @Input({ required: true }) hasNextPage!: Signal<boolean> | boolean;
  @Input() summary: Signal<string> | string = '';

  @Output() pageChange = new EventEmitter<number>();

  /** Resolve signal or raw value. */
  get currentPage(): number {
    return typeof this.pageNumber === 'function' ? (this.pageNumber as Signal<number>)() : this.pageNumber;
  }

  get pages(): number {
    return typeof this.totalPages === 'function' ? (this.totalPages as Signal<number>)() : this.totalPages;
  }

  get canGoPrev(): boolean {
    return typeof this.hasPreviousPage === 'function'
      ? (this.hasPreviousPage as Signal<boolean>)()
      : this.hasPreviousPage;
  }

  get canGoNext(): boolean {
    return typeof this.hasNextPage === 'function'
      ? (this.hasNextPage as Signal<boolean>)()
      : this.hasNextPage;
  }

  get summaryText(): string {
    return typeof this.summary === 'function' ? (this.summary as Signal<string>)() : this.summary;
  }

  /**
   * Generates page numbers to show with ellipsis.
   * Shows: first, last, current ±2, and ellipsis gaps.
   */
  get visiblePages(): (number | '...')[] {
    const total = this.pages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const rangeStart = Math.max(2, current - 1);
    const rangeEnd = Math.min(total - 1, current + 1);

    pages.push(1);

    if (rangeStart > 2) {
      pages.push('...');
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < total - 1) {
      pages.push('...');
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  goToPage(page: number | '...'): void {
    if (page === '...') return;
    if (page < 1 || page > this.pages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  goToPrev(): void {
    if (this.canGoPrev) this.pageChange.emit(this.currentPage - 1);
  }

  goToNext(): void {
    if (this.canGoNext) this.pageChange.emit(this.currentPage + 1);
  }
}

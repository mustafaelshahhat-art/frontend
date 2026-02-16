import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

/**
 * "Load More" button for infinite/append pagination.
 *
 * Usage:
 * ```html
 * <app-load-more
 *   [hasNextPage]="pager.hasNextPage"
 *   [isLoading]="pager.isLoading"
 *   [summary]="pager.summary"
 *   (loadMore)="pager.loadMore()" />
 * ```
 */
@Component({
  selector: 'app-load-more',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './load-more.component.html',
  styleUrls: ['./load-more.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreComponent {
  @Input({ required: true }) hasNextPage!: Signal<boolean> | boolean;
  @Input({ required: true }) isLoading!: Signal<boolean> | boolean;
  @Input() summary: Signal<string> | string = '';

  @Output() loadMore = new EventEmitter<void>();

  get canLoad(): boolean {
    return typeof this.hasNextPage === 'function'
      ? (this.hasNextPage as Signal<boolean>)()
      : this.hasNextPage;
  }

  get loading(): boolean {
    return typeof this.isLoading === 'function'
      ? (this.isLoading as Signal<boolean>)()
      : this.isLoading;
  }

  get summaryText(): string {
    return typeof this.summary === 'function'
      ? (this.summary as Signal<string>)()
      : this.summary;
  }

  onLoadMore(): void {
    if (!this.loading && this.canLoad) {
      this.loadMore.emit();
    }
  }
}

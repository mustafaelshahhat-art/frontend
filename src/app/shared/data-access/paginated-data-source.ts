import { Signal, signal, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, switchMap, tap, catchError, of, distinctUntilChanged, filter } from 'rxjs';
import { PagedResult } from '../../core/models/pagination.model';

// ─── State ───────────────────────────────────────────────────────────────────

export interface PaginationState<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

function defaultState<T>(pageSize: number): PaginationState<T> {
  return {
    items: [],
    pageNumber: 1,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    isLoading: false,
    error: null,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PaginationSource<T> {
  /** Current page items (for standard mode) or accumulated items (for loadMore mode). */
  readonly items: Signal<T[]>;
  readonly pageNumber: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly totalCount: Signal<number>;
  readonly totalPages: Signal<number>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly hasPreviousPage: Signal<boolean>;
  readonly hasNextPage: Signal<boolean>;
  readonly isEmpty: Signal<boolean>;

  /** Summary text, e.g. "عرض 1-20 من 95" */
  readonly summary: Signal<string>;

  /** Navigate to a specific page (standard mode). */
  loadPage(page: number): void;
  nextPage(): void;
  previousPage(): void;
  setPageSize(size: number): void;
  /** Reload the current page. */
  refresh(): void;
  /** Append next page items (loadMore mode). */
  loadMore(): void;
  /** Reset to initial state and reload page 1. */
  reset(): void;
}

// ─── Server-side standard pagination ─────────────────────────────────────────

/**
 * Creates a server-side pagination source with page-switching behavior.
 * Must be called inside an injection context (constructor / field initializer).
 *
 * @param fetchFn Function that returns an Observable<PagedResult<T>> for the given page.
 * @param options  Optional: pageSize (default 20) and initialPage (default 1).
 */
export function createServerPagination<T>(
  fetchFn: (pageNumber: number, pageSize: number) => Observable<PagedResult<T>>,
  options?: { pageSize?: number; initialPage?: number },
): PaginationSource<T> {
  const destroyRef = inject(DestroyRef);
  const ps = options?.pageSize ?? 20;
  const initialPage = options?.initialPage ?? 1;

  const _state = signal<PaginationState<T>>(defaultState<T>(ps));

  // Trigger channel — emits { page, size } whenever we want to fetch.
  const _trigger$ = new Subject<{ page: number; size: number }>();

  // Deduplicate identical requests & switch to latest.
  _trigger$
    .pipe(
      distinctUntilChanged((a, b) => a.page === b.page && a.size === b.size),
      tap(({ page, size }) =>
        _state.update(s => ({ ...s, pageNumber: page, pageSize: size, isLoading: true, error: null })),
      ),
      switchMap(({ page, size }) =>
        fetchFn(page, size).pipe(
          catchError(err => {
            _state.update(s => ({
              ...s,
              isLoading: false,
              error: err?.message ?? 'حدث خطأ أثناء تحميل البيانات',
            }));
            return of(null);
          }),
        ),
      ),
      filter((result): result is PagedResult<T> => result !== null),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(result => {
      _state.set({
        items: result.items,
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        isLoading: false,
        error: null,
      });
    });

  // Computed selectors
  const items = computed(() => _state().items);
  const pageNumber = computed(() => _state().pageNumber);
  const pageSize = computed(() => _state().pageSize);
  const totalCount = computed(() => _state().totalCount);
  const totalPages = computed(() => _state().totalPages);
  const isLoading = computed(() => _state().isLoading);
  const error = computed(() => _state().error);
  const hasPreviousPage = computed(() => _state().pageNumber > 1);
  const hasNextPage = computed(() => _state().pageNumber < _state().totalPages);
  const isEmpty = computed(() => !_state().isLoading && _state().items.length === 0);

  const summary = computed(() => {
    const s = _state();
    if (s.totalCount === 0) return '';
    const start = (s.pageNumber - 1) * s.pageSize + 1;
    const end = Math.min(s.pageNumber * s.pageSize, s.totalCount);
    return `عرض ${start}-${end} من ${s.totalCount}`;
  });

  // Actions
  function loadPage(page: number): void {
    const s = _state();
    if (page < 1 || (s.totalPages > 0 && page > s.totalPages)) return;
    _trigger$.next({ page, size: s.pageSize });
  }

  function nextPage(): void {
    if (hasNextPage()) loadPage(_state().pageNumber + 1);
  }

  function previousPage(): void {
    if (hasPreviousPage()) loadPage(_state().pageNumber - 1);
  }

  function setPageSize(size: number): void {
    if (size < 1) return;
    _state.update(s => ({ ...s, pageSize: size }));
    loadPage(1);
  }

  function refresh(): void {
    const s = _state();
    // Force re-fetch even if same page — bypass distinctUntilChanged by updating state first
    _state.update(st => ({ ...st, isLoading: true, error: null }));
    fetchFn(s.pageNumber, s.pageSize)
      .pipe(
        catchError(err => {
          _state.update(st => ({
            ...st,
            isLoading: false,
            error: err?.message ?? 'حدث خطأ أثناء تحميل البيانات',
          }));
          return of(null);
        }),
        filter((r): r is PagedResult<T> => r !== null),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(result => {
        _state.set({
          items: result.items,
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          isLoading: false,
          error: null,
        });
      });
  }

  function loadMore(): void {
    // Not applicable for standard pagination — use nextPage() instead.
    nextPage();
  }

  function reset(): void {
    _state.set(defaultState<T>(ps));
    loadPage(1);
  }

  // Auto-load first page
  loadPage(initialPage);

  return {
    items, pageNumber, pageSize, totalCount, totalPages,
    isLoading, error, hasPreviousPage, hasNextPage, isEmpty, summary,
    loadPage, nextPage, previousPage, setPageSize, refresh, loadMore, reset,
  };
}

// ─── Server-side load-more (infinite) pagination ─────────────────────────────

/**
 * Creates a server-side load-more pagination source that appends pages.
 * Must be called inside an injection context.
 */
export function createLoadMorePagination<T>(
  fetchFn: (pageNumber: number, pageSize: number) => Observable<PagedResult<T>>,
  options?: { pageSize?: number },
): PaginationSource<T> {
  const destroyRef = inject(DestroyRef);
  const ps = options?.pageSize ?? 20;

  const _state = signal<PaginationState<T>>(defaultState<T>(ps));

  // Accumulated items across pages.
  const _accumulated = signal<T[]>([]);

  function doFetch(page: number, append: boolean): void {
    const s = _state();
    if (s.isLoading) return;
    _state.update(st => ({ ...st, isLoading: true, error: null }));

    fetchFn(page, s.pageSize)
      .pipe(
        catchError(err => {
          _state.update(st => ({
            ...st,
            isLoading: false,
            error: err?.message ?? 'حدث خطأ أثناء تحميل البيانات',
          }));
          return of(null);
        }),
        filter((r): r is PagedResult<T> => r !== null),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(result => {
        const newItems = append
          ? [..._accumulated(), ...result.items]
          : result.items;

        _accumulated.set(newItems);
        _state.set({
          items: newItems,
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          isLoading: false,
          error: null,
        });
      });
  }

  const items = computed(() => _state().items);
  const pageNumber = computed(() => _state().pageNumber);
  const pageSize = computed(() => _state().pageSize);
  const totalCount = computed(() => _state().totalCount);
  const totalPages = computed(() => _state().totalPages);
  const isLoading = computed(() => _state().isLoading);
  const error = computed(() => _state().error);
  const hasPreviousPage = computed(() => _state().pageNumber > 1);
  const hasNextPage = computed(() => _state().pageNumber < _state().totalPages);
  const isEmpty = computed(() => !_state().isLoading && _state().items.length === 0);

  const summary = computed(() => {
    const s = _state();
    if (s.totalCount === 0) return '';
    return `عرض ${_accumulated().length} من ${s.totalCount}`;
  });

  function loadPage(page: number): void {
    doFetch(page, false);
  }

  function loadMore(): void {
    const s = _state();
    if (s.isLoading || !hasNextPage()) return;
    doFetch(s.pageNumber + 1, true);
  }

  function nextPage(): void { loadMore(); }
  function previousPage(): void { /* Not applicable for load-more */ }

  function setPageSize(size: number): void {
    if (size < 1) return;
    _state.update(s => ({ ...s, pageSize: size }));
    _accumulated.set([]);
    doFetch(1, false);
  }

  function refresh(): void {
    _accumulated.set([]);
    doFetch(1, false);
  }

  function reset(): void {
    _accumulated.set([]);
    _state.set(defaultState<T>(ps));
    doFetch(1, false);
  }

  // Auto-load first page
  doFetch(1, false);

  return {
    items, pageNumber, pageSize, totalCount, totalPages,
    isLoading, error, hasPreviousPage, hasNextPage, isEmpty, summary,
    loadPage, nextPage, previousPage, setPageSize, refresh, loadMore, reset,
  };
}

// ─── Client-side pagination (slice existing array) ───────────────────────────

/**
 * Creates a client-side pagination source that slices a signal-based items array.
 * Useful when data is already fully loaded (notifications, activity log, etc.).
 * Must be called inside an injection context.
 */
export function createClientPagination<T>(
  allItems: Signal<T[]>,
  options?: { pageSize?: number },
): PaginationSource<T> {
  const ps = options?.pageSize ?? 20;

  const _pageNumber = signal(1);
  const _pageSize = signal(ps);
  const _isLoading = signal(false);

  const totalCount = computed(() => allItems().length);
  const totalPages = computed(() => {
    const tc = totalCount();
    const sz = _pageSize();
    return sz > 0 ? Math.ceil(tc / sz) : 0;
  });

  // Safe page number — auto-corrects if data shrinks below current page.
  const _safePage = computed(() => {
    const tp = totalPages();
    const p = _pageNumber();
    if (tp === 0) return 1;
    return Math.min(p, tp);
  });

  const items = computed(() => {
    const all = allItems();
    const page = _safePage();
    const size = _pageSize();
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  const pageNumber = computed(() => _safePage());
  const pageSize = _pageSize.asReadonly();
  const isLoading = _isLoading.asReadonly();
  const error = signal<string | null>(null).asReadonly();
  const hasPreviousPage = computed(() => _safePage() > 1);
  const hasNextPage = computed(() => _safePage() < totalPages());
  const isEmpty = computed(() => allItems().length === 0);

  const summary = computed(() => {
    const tc = totalCount();
    if (tc === 0) return '';
    const sp = _safePage();
    const start = (sp - 1) * _pageSize() + 1;
    const end = Math.min(sp * _pageSize(), tc);
    return `عرض ${start}-${end} من ${tc}`;
  });

  function loadPage(page: number): void {
    const tp = totalPages();
    if (page < 1) page = 1;
    if (tp > 0 && page > tp) page = tp;
    _pageNumber.set(page);
  }

  function nextPage(): void {
    if (hasNextPage()) _pageNumber.update(p => p + 1);
  }

  function previousPage(): void {
    if (hasPreviousPage()) _pageNumber.update(p => p - 1);
  }

  function setPageSize(size: number): void {
    if (size < 1) return;
    _pageSize.set(size);
    _pageNumber.set(1);
  }

  function refresh(): void {
    // Client-side: just reset to page 1
    _pageNumber.set(1);
  }

  function loadMore(): void {
    nextPage();
  }

  function reset(): void {
    _pageNumber.set(1);
    _pageSize.set(ps);
  }

  return {
    items, pageNumber, pageSize, totalCount, totalPages,
    isLoading, error, hasPreviousPage, hasNextPage, isEmpty, summary,
    loadPage, nextPage, previousPage, setPageSize, refresh, loadMore, reset,
  };
}

// ─── Client-side load-more (infinite/append on client data) ──────────────────

/**
 * Creates a client-side load-more source that progressively reveals items.
 * Shows `allItems.slice(0, visibleCount)` — each `loadMore()` reveals one more page.
 * Useful for card-grid UIs like matches / tournaments.
 */
export function createClientLoadMore<T>(
  allItems: Signal<T[]>,
  options?: { pageSize?: number },
): PaginationSource<T> {
  const ps = options?.pageSize ?? 20;

  const _visibleCount = signal(ps);
  const _pageSize = signal(ps);

  const totalCount = computed(() => allItems().length);
  const totalPages = computed(() => {
    const tc = totalCount();
    const sz = _pageSize();
    return sz > 0 ? Math.ceil(tc / sz) : 0;
  });

  const pageNumber = computed(() => {
    const sz = _pageSize();
    return sz > 0 ? Math.ceil(_visibleCount() / sz) : 1;
  });

  const items = computed(() => allItems().slice(0, _visibleCount()));

  const isLoading = signal(false).asReadonly();
  const error = signal<string | null>(null).asReadonly();
  const hasPreviousPage = computed(() => false);
  const hasNextPage = computed(() => _visibleCount() < totalCount());
  const isEmpty = computed(() => allItems().length === 0);

  const summary = computed(() => {
    const tc = totalCount();
    if (tc === 0) return '';
    const visible = Math.min(_visibleCount(), tc);
    return `عرض ${visible} من ${tc}`;
  });

  function loadPage(page: number): void {
    const sz = _pageSize();
    _visibleCount.set(Math.max(sz, page * sz));
  }

  function nextPage(): void { loadMore(); }
  function previousPage(): void { /* N/A for load-more */ }

  function loadMore(): void {
    if (!hasNextPage()) return;
    _visibleCount.update(c => c + _pageSize());
  }

  function setPageSize(size: number): void {
    if (size < 1) return;
    _pageSize.set(size);
    _visibleCount.set(size);
  }

  function refresh(): void {
    _visibleCount.set(_pageSize());
  }

  function reset(): void {
    _pageSize.set(ps);
    _visibleCount.set(ps);
  }

  return {
    items, pageNumber, pageSize: _pageSize.asReadonly(), totalCount, totalPages,
    isLoading, error, hasPreviousPage, hasNextPage, isEmpty, summary,
    loadPage, nextPage, previousPage, setPageSize, refresh, loadMore, reset,
  };
}

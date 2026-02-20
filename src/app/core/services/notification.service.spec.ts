import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NotificationService } from './notification.service';
import { AuthStore } from '../stores/auth.store';
import { NotificationStore } from '../stores/notification.store';
import { SignalRService } from './signalr.service';
import { RealTimeUpdateService } from './real-time-update.service';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpTesting: HttpTestingController;
  let notificationStore: NotificationStore;

  const isConnectedSubject = new BehaviorSubject<boolean>(false);

  const mockSignalRService = {
    isConnected$: isConnectedSubject.asObservable(),
    createConnection: vi.fn().mockResolvedValue({
      on: vi.fn(),
      state: 'Disconnected',
      invoke: vi.fn(),
    }),
    startConnection: vi.fn().mockResolvedValue(undefined),
    stopAllConnections: vi.fn().mockResolvedValue(undefined),
  };

  const mockRealTimeUpdateService = {
    ensureInitialized: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthStore,
        NotificationStore,
        { provide: SignalRService, useValue: mockSignalRService },
        { provide: RealTimeUpdateService, useValue: mockRealTimeUpdateService },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    notificationStore = TestBed.inject(NotificationStore);
    service = TestBed.inject(NotificationService);

    // Drain any requests triggered by constructor effects
    httpTesting.match(() => true);
  });

  afterEach(() => {
    httpTesting.match(() => true);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── loadNotifications ─────────────────────────────────────

  describe('loadNotifications', () => {
    it('should send GET to /notifications with pagination params', async () => {
      const promise = service.loadNotifications(1);

      const req = httpTesting.expectOne(r =>
        r.url.includes('/notifications') && r.params.get('page') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        items: [{ id: 'n1', title: 'Test', isRead: false }],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 10,
      });

      await promise;
    });
  });

  // ── loadUnreadCount ───────────────────────────────────────

  describe('loadUnreadCount', () => {
    it('should send GET to /notifications/unread-count', async () => {
      const promise = service.loadUnreadCount();

      const req = httpTesting.expectOne(r => r.url.includes('/notifications/unread-count'));
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });

      await promise;
      expect(service.unreadCount()).toBe(5);
    });
  });

  // ── markAsRead ────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should send POST to /notifications/:id/read', () => {
      service.markAsRead('n1').subscribe();

      const req = httpTesting.expectOne(r => r.url.includes('/notifications/n1/read'));
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  // ── markAllAsRead ─────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('should send POST to /notifications/read-all', () => {
      service.markAllAsRead().subscribe();

      const req = httpTesting.expectOne(r => r.url.includes('/notifications/read-all'));
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  // ── deleteNotification ────────────────────────────────────

  describe('deleteNotification', () => {
    it('should send DELETE to /notifications/:id', () => {
      service.deleteNotification('n1').subscribe();

      const req = httpTesting.expectOne(r => r.url.includes('/notifications/n1'));
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});

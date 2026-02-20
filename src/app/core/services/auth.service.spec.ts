import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from '../stores/auth.store';
import { UserRole, UserStatus } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthStore,
      ],
    });

    authStore = TestBed.inject(AuthStore);
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  // ── login ─────────────────────────────────────────────────

  describe('login', () => {
    it('should send POST to /auth/login', () => {
      const mockResponse = {
        token: 'jwt-token-123',
        refreshToken: 'refresh-456',
        user: {
          id: 'u1', displayId: 'U001', name: 'Test User',
          email: 'test@test.com', role: UserRole.PLAYER,
          status: UserStatus.ACTIVE, isEmailVerified: true, createdAt: new Date(),
        },
      };

      service.login({ email: 'test@test.com', password: 'pass123' }).subscribe(response => {
        expect(response.token).toBe('jwt-token-123');
        expect(response.user.email).toBe('test@test.com');
      });

      const req = httpTesting.expectOne(r => r.url.endsWith('/auth/login'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.com', password: 'pass123' });
      req.flush(mockResponse);
    });

    it('should store token in localStorage after login', () => {
      const mockResponse = {
        token: 'stored-token',
        refreshToken: 'stored-refresh',
        user: {
          id: 'u1', displayId: 'U001', name: 'Test',
          email: 'test@test.com', role: UserRole.PLAYER,
          status: UserStatus.ACTIVE, isEmailVerified: true, createdAt: new Date(),
        },
      };

      service.login({ email: 'test@test.com', password: 'pass' }).subscribe();

      httpTesting.expectOne(r => r.url.endsWith('/auth/login')).flush(mockResponse);

      expect(localStorage.getItem('auth_token')).toBe('stored-token');
      expect(localStorage.getItem('refresh_token')).toBe('stored-refresh');
    });
  });

  // ── register ──────────────────────────────────────────────

  describe('register', () => {
    it('should send POST with FormData to /auth/register', () => {
      const mockResponse = {
        token: 'reg-token',
        user: {
          id: 'u2', displayId: 'U002', name: 'New User',
          email: 'new@test.com', role: UserRole.PLAYER,
          status: UserStatus.PENDING, isEmailVerified: false, createdAt: new Date(),
        },
      };

      service.register({
        email: 'new@test.com',
        password: 'secure123',
        name: 'New User',
        role: 'Player',
      }).subscribe(response => {
        expect(response.token).toBe('reg-token');
      });

      const req = httpTesting.expectOne(r => r.url.endsWith('/auth/register'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  // ── logout ────────────────────────────────────────────────

  describe('logout', () => {
    it('should clear auth tokens from localStorage', () => {
      localStorage.setItem('auth_token', 'some-token');
      localStorage.setItem('refresh_token', 'some-refresh');
      localStorage.setItem('current_user', '{}');

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
    });
  });

  // ── getToken ──────────────────────────────────────────────

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  // ── getCurrentUser ────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('should return parsed user from localStorage', () => {
      const user = { id: 'u1', name: 'Test', role: UserRole.PLAYER };
      localStorage.setItem('current_user', JSON.stringify(user));
      const result = service.getCurrentUser();
      expect(result).toBeTruthy();
      expect(result!.id).toBe('u1');
    });

    it('should return null when no user is stored', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('current_user', 'not-json');
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  // ── isAuthenticated ───────────────────────────────────────

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false for expired token', () => {
      // Create a JWT with expired exp claim
      const payload = { sub: 'u1', exp: Math.floor(Date.now() / 1000) - 3600 };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('auth_token', fakeToken);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true for valid non-expired token', () => {
      const payload = { sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('auth_token', fakeToken);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  // ── hasAnyRole ────────────────────────────────────────────

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const user = { id: 'u1', role: UserRole.ADMIN };
      localStorage.setItem('current_user', JSON.stringify(user));
      expect(service.hasAnyRole([UserRole.ADMIN, UserRole.PLAYER])).toBe(true);
    });

    it('should return false when user role is not in the list', () => {
      const user = { id: 'u1', role: UserRole.PLAYER };
      localStorage.setItem('current_user', JSON.stringify(user));
      expect(service.hasAnyRole([UserRole.ADMIN])).toBe(false);
    });

    it('should return false when no user is stored', () => {
      expect(service.hasAnyRole([UserRole.ADMIN])).toBe(false);
    });
  });
});

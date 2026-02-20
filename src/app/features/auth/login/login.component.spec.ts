import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { UserRole, UserStatus } from '../../../core/models/user.model';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: {
    login: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
  };
  let systemSettingsSpy: {
    getMaintenanceStatus: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockReturnValue(null),
    };

    systemSettingsSpy = {
      getMaintenanceStatus: vi.fn().mockReturnValue(of({ maintenanceMode: false })),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SystemSettingsService, useValue: systemSettingsSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // ── Component creation ────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with a login form', () => {
    expect(component.loginForm).toBeTruthy();
    expect(component.loginForm.contains('email')).toBe(true);
    expect(component.loginForm.contains('password')).toBe(true);
  });

  // ── Form validation ───────────────────────────────────────

  describe('form validation', () => {
    it('should mark form as invalid when email is empty', () => {
      component.loginForm.patchValue({ email: '', password: 'password123' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as invalid when password is empty', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: '' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as invalid when email format is wrong', () => {
      component.loginForm.patchValue({ email: 'not-an-email', password: 'password123' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as invalid when password is too short', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: '123' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should mark form as valid with correct email and password', () => {
      component.loginForm.patchValue({ email: 'test@test.com', password: 'password123' });
      expect(component.loginForm.valid).toBe(true);
    });
  });

  // ── onSubmit ──────────────────────────────────────────────

  describe('onSubmit', () => {
    it('should not call login when form is invalid', async () => {
      component.loginForm.patchValue({ email: '', password: '' });
      await component.onSubmit();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should call authService.login with email and password', async () => {
      const mockUser = {
        id: 'u1', name: 'Test', role: UserRole.PLAYER,
        status: UserStatus.ACTIVE,
      };
      authServiceSpy.login.mockReturnValue(of({ token: 'tok', user: mockUser }));
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass123456' });
      await component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass123456',
      });
    });

    it('should set errorMessage on login failure', async () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({ error: { message: 'بيانات خاطئة' } }))
      );

      component.loginForm.patchValue({ email: 'test@test.com', password: 'wrong12345' });
      await component.onSubmit();

      expect(component.errorMessage()).toBe('بيانات خاطئة');
    });

    it('should set isLoading to false after successful login', async () => {
      const mockUser = { id: 'u1', name: 'Test', role: UserRole.PLAYER };
      authServiceSpy.login.mockReturnValue(of({ token: 'tok', user: mockUser }));
      vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.loginForm.patchValue({ email: 'test@test.com', password: 'pass123456' });
      await component.onSubmit();

      expect(component.isLoading()).toBe(false);
    });

    it('should navigate to admin dashboard for Admin role', async () => {
      const mockUser = { id: 'u1', name: 'Admin', role: UserRole.ADMIN };
      authServiceSpy.login.mockReturnValue(of({ token: 'tok', user: mockUser }));
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.loginForm.patchValue({ email: 'admin@test.com', password: 'admin12345' });
      await component.onSubmit();

      expect(navSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('should navigate to player team-management for Player role', async () => {
      const mockUser = { id: 'u1', name: 'Player', role: UserRole.PLAYER };
      authServiceSpy.login.mockReturnValue(of({ token: 'tok', user: mockUser }));
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.loginForm.patchValue({ email: 'player@test.com', password: 'player1234' });
      await component.onSubmit();

      expect(navSpy).toHaveBeenCalledWith(['/player/team-management']);
    });
  });

  // ── Maintenance ───────────────────────────────────────────

  describe('maintenance mode', () => {
    it('should check maintenance status on init', () => {
      expect(systemSettingsSpy.getMaintenanceStatus).toHaveBeenCalled();
    });
  });
});

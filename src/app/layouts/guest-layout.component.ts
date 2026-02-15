import { Component, ChangeDetectionStrategy, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { AuthStore } from '../core/stores/auth.store';
import { LayoutOrchestratorService } from '../core/services/layout-orchestrator.service';

@Component({
    selector: 'app-guest-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IconComponent,
        PageHeaderComponent
    ],
    template: `
        <div class="guest-layout-wrapper">
            <!-- Premium Floating Navbar -->
            <nav class="guest-navbar">
                <div class="nav-container">
                    <div class="brand" (click)="router.navigate(['/'])">
                        <img src="assets/images/logo-kz.png" alt="Logo" class="nav-logo">
                        <span class="brand-text">KoraZone<span class="text-primary">365</span></span>
                    </div>
                    
                    <div class="nav-actions">
                        <button class="btn-logout-minimal" (click)="handleLogout()">
                            <span>تسجيل الخروج</span>
                            <app-icon name="logout"></app-icon>
                        </button>
                    </div>
                </div>
            </nav>

            <main class="guest-main-content">
                <div class="content-container">
                    <!-- Elegant Header Section -->
                    <header class="guest-welcome-header">
                        <div class="header-badge">تصفح الضيوف</div>
                        <h1 class="welcome-title">مرحباً بك في عالم <span class="gradient-text">البطولات</span></h1>
                        <p class="welcome-subtitle">تصفح أقوى المنافسات، تابع النتائج، وعش أجواء المباريات لحظة بلحظة.</p>
                    </header>

                    <!-- Premium Notice Card -->
                    <div class="premium-notice-card">
                        <div class="notice-icon-wrapper">
                            <app-icon name="info"></app-icon>
                        </div>
                        <div class="notice-text">
                            <h3>وضع المشاهدة فقط</h3>
                            <p>أنت تتصفح المنصة كضيف. استمتع بمتابعة البطولات والنتائج الحية. للتفاعل والمشاركة، يرجى إنشاء حساب.</p>
                        </div>
                        <a routerLink="/auth/register" class="btn-notice-cta">سجل الآن</a>
                    </div>

                    <!-- Dynamic Page Header from Layout Service -->
                    @if (layout.title()) {
                        <div class="page-header-minimal">
                            <h2 class="title">{{ layout.title() }}</h2>
                            <p class="subtitle" *ngIf="layout.subtitle()">{{ layout.subtitle() }}</p>
                        </div>
                    }

                    <div class="main-router-content">
                        <router-outlet />
                    </div>
                </div>
            </main>

            <!-- Background Decorations -->
            <div class="bg-blur-circle circle-1"></div>
            <div class="bg-blur-circle circle-2"></div>
        </div>
    `,
    styles: [`
        :host {
            --primary: #2563eb;
            --primary-light: #60a5fa;
            --dark-bg: #0a0a0a;
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
        }

        .guest-layout-wrapper {
            min-height: 100vh;
            background: var(--dark-bg);
            color: white;
            position: relative;
            overflow-x: hidden;
            font-family: 'Tajawal', sans-serif;
        }

        /* Ambient Background */
        .bg-blur-circle {
            position: fixed;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            filter: blur(120px);
            z-index: 0;
            opacity: 0.15;
            pointer-events: none;
        }

        .circle-1 { top: -100px; right: -100px; background: var(--primary); }
        .circle-2 { bottom: -100px; left: -100px; background: #06b6d4; }

        /* Navbar */
        .guest-navbar {
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 1.5rem 0;
            background: rgba(10, 10, 10, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
        }

        .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }

        .nav-logo { height: 45px; width: auto; }
        .brand-text { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.5px; }
        .text-primary { color: var(--primary-light); }

        .btn-logout-minimal {
            background: transparent;
            border: 1px solid var(--glass-border);
            color: rgba(255, 255, 255, 0.6);
            padding: 8px 16px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            
            &:hover {
                background: rgba(255, 255, 255, 0.05);
                color: white;
                border-color: rgba(255, 255, 255, 0.2);
            }
        }

        /* Main Content */
        .guest-main-content {
            position: relative;
            z-index: 1;
            padding: 4rem 0;
        }

        .content-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }

        /* Welcome Header */
        .guest-welcome-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .header-badge {
            display: inline-block;
            background: rgba(37, 99, 235, 0.1);
            color: var(--primary-light);
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(37, 99, 235, 0.2);
        }

        .welcome-title {
            font-size: 3.5rem;
            font-weight: 900;
            margin-bottom: 1rem;
            line-height: 1.2;
            
            @media (max-width: 768px) { font-size: 2.5rem; }
        }

        .gradient-text {
            background: linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .welcome-subtitle {
            font-size: 1.25rem;
            color: rgba(255, 255, 255, 0.6);
            max-width: 700px;
            margin: 0 auto;
        }

        /* Premium Notice Card */
        .premium-notice-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 2rem;
            display: flex;
            align-items: center;
            gap: 2rem;
            margin-bottom: 4rem;
            backdrop-filter: blur(10px);
            
            @media (max-width: 768px) {
                flex-direction: column;
                text-align: center;
                gap: 1.5rem;
            }
        }

        .notice-icon-wrapper {
            width: 60px;
            height: 60px;
            background: var(--primary);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
        }

        .notice-text {
            flex: 1;
            h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: white; }
            p { font-size: 1rem; color: rgba(255, 255, 255, 0.6); line-height: 1.6; }
        }

        .btn-notice-cta {
            background: white;
            color: black;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 800;
            text-decoration: none;
            transition: all 0.3s ease;
            white-space: nowrap;
            
            &:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
            }
        }

        /* Section Header */
        .page-header-minimal {
            margin-bottom: 2.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--glass-border);
            
            .title { font-size: 2rem; font-weight: 900; color: white; margin-bottom: 4px; }
            .subtitle { color: rgba(255, 255, 255, 0.5); font-size: 1.1rem; }
        }

        .main-router-content {
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestLayoutComponent implements OnInit {
    private readonly authStore = inject(AuthStore);
    public readonly router = inject(Router);
    public readonly layout = inject(LayoutOrchestratorService);

    currentUser = this.authStore.currentUser;
    isMobile = false;
    windowSize = window.innerWidth;

    ngOnInit(): void {
        this.checkScreenSize();
    }

    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }

    private checkScreenSize(): void {
        this.windowSize = window.innerWidth;
        this.isMobile = this.windowSize < 992;
    }

    handleLogout(): void {
        this.authStore.clearAuth();
        localStorage.clear();
        this.router.navigate(['/']);
    }
}

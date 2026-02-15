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

                    <!-- Desktop Menu -->
                    <div class="nav-menu desktop-only">
                        <a routerLink="/" class="nav-link">الرئيسية</a>
                        <a routerLink="/guest/tournaments" class="nav-link active">البطولات</a>
                        <a routerLink="/" fragment="about" class="nav-link">من نحن</a>
                        <a routerLink="/" fragment="faq" class="nav-link">الأسئلة الشائعة</a>
                        <a routerLink="/" fragment="contact" class="nav-link">تواصل معنا</a>
                    </div>
                    
                    <div class="nav-actions">
                        <button class="btn-logout-minimal" (click)="handleLogout()">
                            <span>تسجيل الخروج</span>
                            <app-icon name="logout"></app-icon>
                        </button>
                    </div>

                     <!-- Mobile Menu Button -->
                     <button class="hamburger-btn" (click)="toggleMobileMenu()" [class.active]="isMobileMenuOpen">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>

                <!-- Mobile Menu Overlay -->
                 @if (isMobileMenuOpen) {
                    <div class="mobile-menu-overlay" (click)="toggleMobileMenu()">
                        <div class="mobile-menu-content" (click)="$event.stopPropagation()">
                             <a routerLink="/" class="mobile-link" (click)="toggleMobileMenu()">الرئيسية</a>
                            <a routerLink="/guest/tournaments" class="mobile-link active" (click)="toggleMobileMenu()">البطولات</a>
                            <a routerLink="/" fragment="about" class="mobile-link" (click)="toggleMobileMenu()">من نحن</a>
                            <a routerLink="/" fragment="faq" class="mobile-link" (click)="toggleMobileMenu()">الأسئلة الشائعة</a>
                            <a routerLink="/" fragment="contact" class="mobile-link" (click)="toggleMobileMenu()">تواصل معنا</a>
                            
                            <button class="btn-logout-mobile" (click)="handleLogout()">
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>
                 }
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

            <!-- Footer -->
            <footer class="footer">
                <div class="content-container footer-content">
                    <div class="footer-brand">
                        <div class="footer-logo">KoraZone365</div>
                        <p class="footer-desc">المنصة الأولى لعشاق كرة القدم وتنظيم البطولات الاحترافية.</p>
                    </div>
                    <div class="footer-links">
                        <h4>روابط سريعة</h4>
                        <ul>
                            <li><a routerLink="/">الرئيسية</a></li>
                            <li><a routerLink="/guest/tournaments">البطولات</a></li>
                            <li><a routerLink="/" fragment="about">من نحن</a></li>
                            <li><a routerLink="/auth/register">إنشاء حساب</a></li>
                        </ul>
                    </div>
                    <div class="footer-contact">
                        <h4>معلومات التواصل</h4>
                        <p>المنصورة، جمهورية مصر العربية</p>
                        <p>korazone365@gmail.com</p>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; {{ currentYear }} KoraZone365 - All Rights Reserved</p>
                </div>
            </footer>
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
            display: flex;
            flex-direction: column;
        }

        /* Ambient Background */
        .bg-blur-circle {
            position: fixed;
            width: 800px;
            height: 800px;
            border-radius: 50%;
            filter: blur(140px);
            z-index: 0;
            opacity: 0.12;
            pointer-events: none;
        }

        .circle-1 { 
            top: -250px; 
            right: -200px; 
            background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
        }
        
        .circle-2 { 
            bottom: -250px; 
            left: -200px; 
            background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
        }

        /* Navbar */
        .guest-navbar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 400; /* var(--z-header) */
            padding: 1rem 0;
            background: rgba(10, 10, 10, 0.9);
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
            z-index: 102; /* Above mobile menu */
        }

        .nav-logo { height: 40px; width: auto; }
        .brand-text { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.5px; }
        .text-primary { color: var(--primary-light); }

        /* Desktop Menu */
        .nav-menu {
            display: flex;
            gap: 2rem;
            align-items: center;

            &.desktop-only {
                @media (max-width: 992px) {
                    display: none;
                }
            }
        }

        .nav-link {
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
            font-size: 1rem;

            &:hover, &.active {
                color: var(--primary-light);
            }
        }

        .nav-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 102; /* Above mobile menu */

            @media (max-width: 992px) {
                display: none; /* Hide logout on mobile header, move to menu */
            }
        }

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

        /* Hamburger Button */
        .hamburger-btn {
            display: none;
            flex-direction: column;
            justify-content: space-between;
            width: 30px;
            height: 20px;
            background: transparent;
            border: none;
            cursor: pointer;
            z-index: 102; /* Above mobile menu */
            padding: 0;

            @media (max-width: 992px) {
                display: flex;
            }

            span {
                width: 100%;
                height: 2px;
                background: white;
                transition: all 0.3s ease;
                border-radius: 2px;
            }

            &.active {
                span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
                span:nth-child(2) { opacity: 0; }
                span:nth-child(3) { transform: rotate(-45deg) translate(5px, -6px); }
            }
        }

        /* Mobile Menu */
        .mobile-menu-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(10px);
            z-index: 101;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s ease-out;
        }

        .mobile-menu-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            width: 100%;
            padding: 2rem;
        }

        .mobile-link {
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
            text-decoration: none;
            transition: color 0.3s ease;

            &:hover, &.active {
                color: var(--primary-light);
            }
        }

        .btn-logout-mobile {
            margin-top: 2rem;
            background: rgba(255, 59, 59, 0.1);
            color: #ff6b6b;
            border: 1px solid rgba(255, 59, 59, 0.2);
            padding: 12px 30px;
            border-radius: 50px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
                background: rgba(255, 59, 59, 0.2);
            }
        }

        /* Main Content */
        .guest-main-content {
            position: relative;
            z-index: 1;
            padding: 6rem 0 4rem; /* Increased top padding to account for fixed navbar */
            flex: 1; /* Push footer down */
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

        /* Footer */
        .footer {
            background: #020202;
            padding: 60px 0 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            margin-top: auto; /* Push footer to bottom */
            position: relative;
            z-index: 10;

            .footer-content {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 40px;
                margin-bottom: 40px;
            }

            .footer-brand {
                max-width: 300px;
                
                .footer-logo {
                    font-size: 1.8rem;
                    font-weight: 900;
                    margin-bottom: 1rem;
                    background: linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .footer-desc {
                    color: rgba(255, 255, 255, 0.5);
                    line-height: 1.6;
                }
            }

            h4 {
                color: white;
                margin-bottom: 1.2rem;
                font-size: 1.1rem;
                position: relative;
                padding-bottom: 8px;

                &::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 30px;
                    height: 2px;
                    background: var(--primary);
                }
            }

            ul {
                list-style: none;
                padding: 0;
                
                li {
                    margin-bottom: 12px;
                    
                    a {
                        text-decoration: none;
                        color: rgba(255, 255, 255, 0.6);
                        transition: all 0.3s;
                        cursor: pointer;

                        &:hover {
                            color: white;
                            padding-right: 5px;
                        }
                    }
                }
            }

            .footer-contact p {
                color: rgba(255, 255, 255, 0.6);
                margin-bottom: 12px;
            }

            .footer-bottom {
                text-align: center;
                padding-top: 2rem;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.4);
                font-size: 0.9rem;
            }
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
    isMobileMenuOpen = false;
    currentYear = new Date().getFullYear();

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
        if (!this.isMobile) {
            this.isMobileMenuOpen = false; // Close menu on resize to desktop
        }
    }

    toggleMobileMenu(): void {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
    }

    handleLogout(): void {
        this.authStore.clearAuth();
        localStorage.clear();
        this.router.navigate(['/']);
    }
}

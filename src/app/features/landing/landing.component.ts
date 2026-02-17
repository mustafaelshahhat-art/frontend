import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class LandingComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    currentYear = new Date().getFullYear();
    isMenuOpen = false;
    activeFaq: number | null = null;
    showAllFaqs = false;

    faqs = [
        {
            question: 'ما هي Kora Zone 365؟',
            answer: 'Kora Zone 365 هي منصة احترافية لإدارة وتنظيم بطولات كرة القدم، تتيح للاعبين إنشاء فرقهم، التسجيل في البطولات، ومتابعة النتائج والإحصائيات لحظة بلحظة.'
        },
        {
            question: 'كيف يمكنني إنشاء فريق؟',
            answer: 'بعد تسجيل حسابك، يمكنك إنشاء فريق جديد من لوحة التحكم، إضافة اللاعبين، وتحديد قائد الفريق، ثم التقدم للتسجيل في البطولات المتاحة.'
        },
        {
            question: 'هل يمكنني الاشتراك في أكثر من بطولة؟',
            answer: 'نعم، يمكنك المشاركة في أكثر من بطولة في نفس الوقت طالما أن فريقك مستوفي شروط التسجيل الخاصة بكل بطولة.'
        },
        {
            question: 'كيف يتم تأكيد التسجيل في البطولة؟',
            answer: 'بعد التقديم، يتم مراجعة طلب التسجيل من قبل إدارة البطولة. عند الموافقة وإتمام الدفع (إن وجد)، يتم تأكيد مشاركتك رسميًا.'
        },
        {
            question: 'كيف يتم احتساب ترتيب الفرق؟',
            answer: 'يتم احتساب الترتيب تلقائيًا بناءً على: عدد النقاط، فارق الأهداف، عدد الأهداف المسجلة، ونتائج المواجهات المباشرة (عند الحاجة).'
        },
        {
            question: 'هل يمكن تعديل بيانات الفريق بعد التسجيل؟',
            answer: 'يمكنك تعديل بيانات الفريق قبل إغلاق باب التسجيل. بعد بدء البطولة، قد تكون بعض التعديلات مقيدة حسب قوانين البطولة.'
        },
        {
            question: 'كيف أتابع نتائج المباريات؟',
            answer: 'يمكنك متابعة جدول المباريات والنتائج المباشرة وترتيب المجموعات وإحصائيات اللاعبين، كل ذلك من صفحة البطولة الخاصة بك.'
        },
        {
            question: 'هل المنصة آمنة؟',
            answer: 'نعم، المنصة تستخدم أحدث معايير الحماية لحفظ بيانات المستخدمين وضمان أمان عمليات التسجيل والدفع.'
        },
        {
            question: 'ماذا أفعل إذا واجهت مشكلة تقنية؟',
            answer: 'يمكنك التواصل معنا من خلال صفحة "اتصل بنا"، وسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.'
        },
        {
            question: 'هل يمكنني تنظيم بطولة خاصة بي؟',
            answer: 'نعم، يمكنك إنشاء بطولة جديدة وتحديد نظامها وعدد الفرق وشروط المشاركة، وإدارة كل تفاصيلها من خلال المنصة.'
        }
    ];

    // Stats values
    playersCount = 0;
    teamsCount = 0;
    tournamentsCount = 0;
    matchesCount = 0;

    private countersStarted = false;

    ngOnInit(): void {
        this.setupIntersectionObserver();
    }

    private setupIntersectionObserver(): void {
        const options = {
            root: null,
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.countersStarted) {
                    this.startCounters();
                    this.countersStarted = true;
                }
            });
        }, options);

        const target = document.querySelector('.stats-section');
        if (target) {
            observer.observe(target);
        }
    }

    private startCounters(): void {
        this.animateValue('playersCount', 0, 500, 2000);
        this.animateValue('teamsCount', 0, 80, 2000);
        this.animateValue('tournamentsCount', 0, 30, 2000);
        this.animateValue('matchesCount', 0, 1200, 2000);
    }

    private animateValue(prop: 'playersCount' | 'teamsCount' | 'tournamentsCount' | 'matchesCount', start: number, end: number, duration: number): void {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);

            switch (prop) {
                case 'playersCount': this.playersCount = value; break;
                case 'teamsCount': this.teamsCount = value; break;
                case 'tournamentsCount': this.tournamentsCount = value; break;
                case 'matchesCount': this.matchesCount = value; break;
            }

            this.cdr.detectChanges();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    toggleMenu(): void {
        this.isMenuOpen = !this.isMenuOpen;
    }

    closeMenu(): void {
        this.isMenuOpen = false;
    }

    toggleFaq(index: number): void {
        this.activeFaq = this.activeFaq === index ? null : index;
    }

    toggleShowAllFaqs(): void {
        this.showAllFaqs = !this.showAllFaqs;
    }

    scrollTo(elementId: string): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    continueAsGuest(): void {
        this.authService.loginAsGuest().subscribe({
            next: () => {
                this.router.navigate(['/guest/tournaments']);
            },
            error: (err) => {
                console.error('Guest login failed', err);
                // Even if logging fails, we can still navigate as guest in frontend
                this.router.navigate(['/guest/tournaments']);
            }
        });
    }
}

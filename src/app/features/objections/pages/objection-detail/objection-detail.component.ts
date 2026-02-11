import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Component, OnInit, inject, ChangeDetectorRef, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ContextNavigationService } from '../../../../core/navigation/context-navigation.service';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { ObjectionStore } from '../../../../core/stores/objection.store';
import { Objection, ObjectionStatus, ObjectionType } from '../../../../core/models/objection.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LayoutOrchestratorService } from '../../../../core/services/layout-orchestrator.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-objection-detail',
    standalone: true,
    imports: [IconComponent,
        CommonModule,
        FormsModule,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        EmptyStateComponent
    ],
    template: `
        <div class="objection-detail-content">
            @if (isLoading) {
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>جاري تحميل التفاصيل...</p>
            </div>
            }

            @if (!isLoading && !objection) {
            <div class="error-state">
                <app-empty-state icon="search_off" title="لم يتم العثور على الاعتراض"
                    description="قد يكون الاعتراض غير موجود أو تم حذفه">
                    <app-button (click)="loadObjection()">إعادة المحاولة</app-button>
                </app-empty-state>
            </div>
            }

            @if (!isLoading && objection) {
            <div class="detail-grid">
                <!-- Main Content -->
                <div class="main-column">
                    <app-card [title]="'وصف الاعتراض'" icon="description">
                        <div class="objection-description rounded-xl border border-visible mb-lg">
                            {{ objection.description }}
                        </div>

                        @if (objection.evidence && objection.evidence.length > 0) {
                        <div class="evidence-section">
                            <h4 class="text-sm font-bold mb-md text-secondary">المرفقات والأدلة</h4>
                            <div class="evidence-grid">
                                @for (img of objection.evidence; track img) {
                                <div class="evidence-item rounded-xl overflow-hidden border border-visible hover-lift">
                                    <img [src]="img" alt="Evidence" class="evidence-img">
                                </div>
                                }
                            </div>
                        </div>
                        }
                    </app-card>

                    <!-- Decision Section (Admin Only) -->
                    @if (objection.status === ObjectionStatus.PENDING || objection.status === ObjectionStatus.UNDER_REVIEW) {
                    <app-card title="اتخاذ قرار" icon="gavel" class="decision-card">
                        <div class="form-group mb-lg">
                            <span class="label mb-xs">ملاحظات اللجنة (اختياري)</span>
                            <textarea [(ngModel)]="adminNotes" class="premium-input w-full" rows="3" 
                                placeholder="اكتب مبررات القرار هنا..."></textarea>
                        </div>
                        <div class="flex gap-md justify-end">
                            <app-button variant="ghost" class="text-danger" icon="cancel" 
                                (click)="handleDecision(ObjectionStatus.REJECTED)">رفض الاعتراض</app-button>
                            <app-button variant="primary" icon="check_circle" 
                                (click)="handleDecision(ObjectionStatus.APPROVED)">قبول الاعتراض</app-button>
                        </div>
                    </app-card>
                    }

                    <!-- Feedback Display -->
                    @if (objection.adminNotes) {
                    <app-card title="قرار اللجنة" icon="feedback" class="feedback-card">
                        <div class="decision-feedback p-md rounded-xl border">
                            <div class="flex items-center gap-2 mb-sm">
                                <app-icon name="schedule" class="text-primary text-sm icon-sm"></app-icon>
                                <span class="text-xs text-muted">{{ objection.reviewedDate | date:'yyyy/MM/dd HH:mm' }}</span>
                                <span class="text-xs text-muted">بواسطة: {{ objection.reviewedBy || 'مسؤول النظام' }}</span>
                            </div>
                            <p class="text-secondary m-0">{{ objection.adminNotes }}</p>
                        </div>
                    </app-card>
                    }
                </div>

                <!-- Sidebar Info -->
                <div class="side-column">
                    <app-card title="معلومات الاعتراض" icon="info">
                        <div class="info-list flex-col gap-lg">
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">الحالة</span>
                                <app-badge [type]="getStatusBadgeType(objection.status)">
                                    {{ getStatusLabel(objection.status) }}
                                </app-badge>
                            </div>
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">التاريخ</span>
                                <span class="text-secondary text-sm font-semibold">{{ objection.createdAt | date:'yyyy/MM/dd' }}</span>
                            </div>
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">النوع</span>
                                <span class="text-primary text-sm font-bold">{{ getTypeLabel(objection.type) }}</span>
                            </div>
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">المباراة</span>
                                <span class="text-gold text-sm font-bold">{{ objection.homeTeamName }} vs {{ objection.awayTeamName }}</span>
                            </div>
                            <div class="border-t pt-md mt-md">
                                <div class="flex items-center gap-2 mb-sm">
                                    <div class="avatar-xs bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                        {{ objection.captainName.charAt(0) }}
                                    </div>
                                    <div class="flex-col">
                                        <span class="text-sm font-bold">{{ objection.captainName }}</span>
                                        <span class="text-xs text-muted">كابتن فريق {{ objection.teamName }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </app-card>

                    <app-card title="البطولة" icon="emoji_events">
                        <div class="flex items-center gap-3">
                            <div class="tournament-icon bg-gold bg-opacity-10 text-gold p-2 rounded-lg">
                                <app-icon name="military_tech" class=" icon-sm"></app-icon>
                            </div>
                            <span class="font-bold text-secondary">{{ objection.tournamentName }}</span>
                        </div>
                    </app-card>
                </div>
            </div>
            }
        </div>
    `,
    styles: [`
        .objection-detail-content {
            width: 100%;
        }

        .loading-state, .error-state {
            padding: 4rem;
            text-align: center;
            color: var(--text-muted);
        }

        .detail-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: var(--space-xl);
            align-items: start;

            @media (max-width: 1024px) {
                grid-template-columns: 1fr;
            }
        }

        .main-column, .side-column {
            display: flex;
            flex-direction: column;
            gap: var(--space-xl);
        }

        .objection-description {
            padding: var(--space-md);
            background: var(--bg-surface);
            line-height: 1.8;
            color: var(--text-secondary);
            font-size: 1rem;
            white-space: pre-wrap;
        }

        .evidence-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: var(--space-md);
        }

        .evidence-img {
            width: 100%;
            height: 120px;
            object-fit: cover;
        }

        .decision-feedback {
            background: var(--color-primary-5);
            border-color: var(--color-primary-20);
        }

        .premium-input {
            background: var(--bg-surface-light);
            border: 1px solid var(--border-visible);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
            color: var(--text-primary);
            width: 100%;
            outline: none;
            transition: all 0.3s ease;
            &:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--color-primary-10);
            }
        }

        .label { 
            display: block; 
            font-size: var(--text-sm); 
            color: var(--text-muted); 
            font-weight: var(--font-medium); 
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObjectionDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private objectionsService = inject(ObjectionsService);
    private objectionStore = inject(ObjectionStore);
    private layoutOrchestrator = inject(LayoutOrchestratorService);
    private uiFeedback = inject(UIFeedbackService);
    private cdr = inject(ChangeDetectorRef);
    private navService = inject(ContextNavigationService);

    objection: Objection | undefined;
    isLoading = false;
    adminNotes = '';
    ObjectionStatus = ObjectionStatus;

    constructor() {
        effect(() => {
            const obs = this.objectionStore.objections();
            const id = this.route.snapshot.paramMap.get('id');
            if (id) {
                const updated = obs.find(o => o.id === id);
                if (updated && (!this.objection ||
                    updated.status !== this.objection.status ||
                    updated.adminNotes !== this.objection.adminNotes ||
                    updated.reviewedBy !== this.objection.reviewedBy ||
                    updated.reviewedDate !== this.objection.reviewedDate)) {
                    this.objection = updated;
                    this.cdr.detectChanges();
                }
            }
        });
    }

    ngOnInit(): void {
        this.loadObjection();
    }

    private updateLayout(): void {
        if (!this.objection) return;
        this.layoutOrchestrator.setTitle(`اعتراض مباراة: ${this.objection.homeTeamName} ضد ${this.objection.awayTeamName}`);
        this.layoutOrchestrator.setSubtitle('مراجعة بيانات الاعتراض واتخاذ القرار المناسب');
        this.layoutOrchestrator.setBackAction(() => this.navigateBack());
    }

    ngOnDestroy(): void {
        this.layoutOrchestrator.reset();
    }

    loadObjection(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isLoading = true;
            this.objectionsService.getObjectionById(id).subscribe({
                next: (data) => {
                    this.objection = data;
                    // Add to store for real-time tracking if missing
                    this.objectionStore.upsertObjection(data);
                    this.updateLayout();
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.isLoading = false;
                    this.uiFeedback.error('خطأ', 'فشل في تحميل تفاصيل الاعتراض');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    navigateBack(): void {
        this.navService.navigateTo('objections');
    }

    getTypeLabel(type: ObjectionType): string {
        const labels: Record<string, string> = {
            [ObjectionType.MATCH_RESULT]: 'نتيجة مباراة',
            [ObjectionType.REFEREE_DECISION]: 'قرار حكم',
            [ObjectionType.PLAYER_ELIGIBILITY]: 'أهلية لاعب',
            [ObjectionType.RULE_VIOLATION]: 'مخالفة قوانين',
            [ObjectionType.OTHER]: 'أخرى'
        };
        return labels[type] || type;
    }

    getStatusLabel(status: ObjectionStatus): string {
        const labels: Record<string, string> = {
            [ObjectionStatus.PENDING]: 'قيد الانتظار',
            [ObjectionStatus.UNDER_REVIEW]: 'تحت المراجعة',
            [ObjectionStatus.APPROVED]: 'مقبول',
            [ObjectionStatus.REJECTED]: 'مرفوض'
        };
        return labels[status] || status;
    }

    getStatusBadgeType(status: ObjectionStatus): 'success' | 'danger' | 'warning' | 'neutral' {
        switch (status) {
            case ObjectionStatus.APPROVED: return 'success';
            case ObjectionStatus.REJECTED: return 'danger';
            case ObjectionStatus.PENDING:
            case ObjectionStatus.UNDER_REVIEW:
                return 'warning';
            default: return 'neutral';
        }
    }

    handleDecision(status: ObjectionStatus): void {
        if (!this.objection) return;

        const actionText = status === ObjectionStatus.APPROVED ? 'قبول' : 'رفض';
        this.uiFeedback.confirm(
            `${actionText} الاعتراض`,
            `هل أنت متأكد من ${actionText} هذا الاعتراض؟`,
            actionText,
            status === ObjectionStatus.APPROVED ? 'info' : 'danger'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.objectionsService.updateObjectionStatus(this.objection!.id, status, this.adminNotes).subscribe((updated: Objection) => {
                    this.objection = updated;
                    this.updateLayout();
                    this.uiFeedback.success('تم بنجاح', `تم ${actionText} الاعتراض وتحديث الحالة.`);
                    this.cdr.detectChanges();
                });
            }
        });
    }
}

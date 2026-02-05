import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { Objection, ObjectionStatus, ObjectionType } from '../../../../core/models/objection.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-objection-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        CardComponent,
        BadgeComponent,
        ButtonComponent
    ],
    template: `
        <div class="objection-detail-page p-xl">
            <app-page-header [title]="'تفاصيل الاعتراض #' + (objection?.id || '')" 
                [subtitle]="'مراجعة بيانات الاعتراض واتخاذ القرار المناسب'">
                <app-button variant="ghost" (click)="navigateBack()" icon="arrow_forward">العودة للقائمة</app-button>
            </app-page-header>

            <div *ngIf="objection" class="grid-3-cols gap-xl mt-xl">
                <!-- Main Content -->
                <div class="col-span-2 flex-col gap-xl">
                    <app-card [title]="'وصف الاعتراض'" icon="description">
                        <div class="objection-description p-md bg-surface rounded-xl border border-visible mb-lg">
                            {{ objection.description }}
                        </div>

                        <div *ngIf="objection.evidence && objection.evidence.length > 0" class="evidence-section">
                            <h4 class="text-sm font-bold mb-md text-secondary">المرفقات والأدلة</h4>
                            <div class="evidence-grid grid-3-cols gap-md">
                                <div *ngFor="let img of objection.evidence; let i = index" 
                                    class="evidence-item rounded-xl overflow-hidden border border-visible hover-lift">
                                    <img [src]="img" alt="Evidence" class="w-full h-32 object-cover">
                                </div>
                            </div>
                        </div>
                    </app-card>

                    <!-- Decision Section (Admin Only) -->
                    <app-card *ngIf="objection.status === ObjectionStatus.PENDING || objection.status === 'under_review'" 
                        title="اتخاذ قرار" icon="gavel" class="decision-card">
                        <div class="form-group mb-lg">
                            <label class="label mb-xs">ملاحظات اللجنة (اختياري)</label>
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

                    <!-- Feedback Display -->
                    <app-card *ngIf="objection.adminNotes" title="قرار اللجنة" icon="feedback" class="feedback-card">
                        <div class="p-md bg-primary bg-opacity-5 rounded-xl border border-primary border-opacity-20">
                            <div class="flex items-center gap-2 mb-sm">
                                <span class="material-symbols-outlined text-primary text-sm">schedule</span>
                                <span class="text-xs text-muted">{{ objection.reviewedDate | date:'yyyy/MM/dd HH:mm' }}</span>
                                <span class="text-xs text-muted">بواسطة: {{ objection.reviewedBy || 'مسؤول النظام' }}</span>
                            </div>
                            <p class="text-secondary m-0">{{ objection.adminNotes }}</p>
                        </div>
                    </app-card>
                </div>

                <!-- Sidebar Info -->
                <div class="flex-col gap-xl">
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
                                <span class="text-secondary text-sm font-semibold">{{ objection.submittedDate | date:'yyyy/MM/dd' }}</span>
                            </div>
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">النوع</span>
                                <span class="text-primary text-sm font-bold">{{ getTypeLabel(objection.type) }}</span>
                            </div>
                            <div class="info-item flex justify-between">
                                <span class="text-muted text-sm">المباراة</span>
                                <span class="text-gold text-sm font-bold">#{{ objection.matchId }}</span>
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
                                <span class="material-symbols-outlined">military_tech</span>
                            </div>
                            <span class="font-bold text-secondary">{{ objection.tournamentName }}</span>
                        </div>
                    </app-card>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .objection-description {
            line-height: 1.8;
            color: var(--text-secondary);
            font-size: 1rem;
            white-space: pre-wrap;
        }
        .premium-input {
            background: var(--surface);
            border: 1px solid var(--border-visible);
            border-radius: 12px;
            padding: 12px;
            color: var(--text-main);
            outline: none;
            transition: all 0.3s ease;
            &:focus {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
            }
        }
        .w-full { width: 100%; }
        .label { display: block; font-size: 0.875rem; color: var(--text-muted); font-weight: 500; }
    `]
})
export class ObjectionDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private objectionsService = inject(ObjectionsService);
    private uiFeedback = inject(UIFeedbackService);

    objection: Objection | undefined;
    adminNotes: string = '';
    ObjectionStatus = ObjectionStatus;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.objectionsService.getObjectionById(id).subscribe(data => {
                this.objection = data;
            });
        }
    }

    navigateBack(): void {
        this.router.navigate(['/admin/objections']);
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
            case ObjectionStatus.PENDING: return 'warning';
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
                this.objectionsService.updateObjectionStatus(this.objection!.id, status, this.adminNotes).subscribe(updated => {
                    this.objection = updated;
                    this.uiFeedback.success('تم بنجاح', `تم ${actionText} الاعتراض وتحديث الحالة.`);
                });
            }
        });
    }
}

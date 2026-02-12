import { Component, EventEmitter, Input, Output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { SelectComponent, SelectOption } from '../../../../shared/components/select/select.component';
import { FormControlComponent } from '../../../../shared/components/form-control/form-control.component';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Match } from '../../../../core/models/tournament.model';
import { ObjectionsService } from '../../../../core/services/objections.service';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-objection-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ModalComponent,
        SelectComponent,
        FormControlComponent,
        FileUploadComponent,
        ButtonComponent
    ],
    templateUrl: './objection-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObjectionModalComponent {
    private objectionsService = inject(ObjectionsService);
    private uiFeedback = inject(UIFeedbackService);

    @Input() match: Match | null = null;
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() submissionSuccess = new EventEmitter<void>();

    objectionForm = {
        type: '',
        description: '',
        files: [] as File[]
    };

    objectionTypeOptions: SelectOption[] = [
        { value: 'MatchResult', label: 'نتيجة المباراة', icon: 'scoreboard' },
        { value: 'PlayerEligibility', label: 'أهلية لاعب', icon: 'person_off' },
        { value: 'RuleViolation', label: 'مخالفة قوانين', icon: 'gavel' },
        { value: 'Other', label: 'أخرى', icon: 'more_horiz' }
    ];

    isSubmitting = signal(false);

    close(): void {
        this.visibleChange.emit(false);
        this.resetForm();
    }

    resetForm(): void {
        this.objectionForm = {
            type: '',
            description: '',
            files: []
        };
    }

    onFilesSelected(files: File[]): void {
        this.objectionForm.files = files;
    }

    submit(): void {
        if (!this.match || !this.objectionForm.type || !this.objectionForm.description) {
            this.uiFeedback.warning('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        this.isSubmitting.set(true);
        const request = {
            matchId: this.match.id,
            type: this.objectionForm.type,
            description: this.objectionForm.description
        };

        this.objectionsService.submitObjection(request).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.uiFeedback.success('تم بنجاح', 'تم تقديم الاعتراض بنجاح');
                this.submissionSuccess.emit();
                this.close();
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.uiFeedback.error('خطأ', err.error?.message || 'فشل في تقديم الاعتراض');
            }
        });
    }
}

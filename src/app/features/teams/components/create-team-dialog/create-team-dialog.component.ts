import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
    selector: 'app-create-team-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, IconComponent, ButtonComponent, ModalComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-modal [visible]="visible" title="إنشاء فريق جديد" icon="groups" size="md"
            (closeRequest)="onClose()">

            <div class="flex-col gap-4">
                <p class="text-muted text-sm mb-2">
                    يرجى إدخال اسم الفريق الذي ترغب في إنشائه
                </p>

                <div class="input-group">
                    <app-icon name="shield" class="icon-sm"></app-icon>
                    <input type="text" [(ngModel)]="teamName" placeholder="أدخل اسم الفريق الجديد"
                        class="team-input w-full" (keyup.enter)="onSubmit()">
                </div>
            </div>

            <div modal-footer>
                <app-button variant="ghost" (click)="onClose()">
                    إلغاء
                </app-button>
                <app-button (click)="onSubmit()" [isLoading]="isCreating" variant="primary" icon="add">
                    إنشاء فريق
                </app-button>
            </div>
        </app-modal>
    `,
    styleUrls: ['./create-team-dialog.component.scss']
})
export class CreateTeamDialogComponent {
    @Input() visible = false;
    @Input() isCreating = false;

    @Output() closeDialog = new EventEmitter<void>();
    @Output() createTeam = new EventEmitter<string>();

    teamName = '';

    onClose(): void {
        this.teamName = '';
        this.closeDialog.emit();
    }

    onSubmit(): void {
        this.createTeam.emit(this.teamName);
    }

    /** Called by parent after successful creation to reset internal state */
    reset(): void {
        this.teamName = '';
    }
}

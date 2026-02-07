import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ToggleComponent } from '../../shared/components/toggle/toggle.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { SystemSettingsService, SystemSettings } from '../../core/services/system-settings.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PageHeaderComponent,
        ButtonComponent,
        ToggleComponent
    ],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly uiFeedback = inject(UIFeedbackService);
    private readonly settingsService = inject(SystemSettingsService);

    settingsForm: FormGroup;
    isLoading = signal(false);
    isSaving = signal(false);

    constructor() {
        this.settingsForm = this.fb.group({
            allowTeamCreation: [true],
            maintenanceMode: [false]
        });
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings(): void {
        this.isLoading.set(true);
        this.settingsService.getSettings()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (settings) => {
                    this.settingsForm.patchValue(settings);
                },
                error: (err) => {
                    this.uiFeedback.error('خطأ', 'فشل تحميل إعدادات النظام');
                    console.error('Error loading settings:', err);
                }
            });
    }

    saveSettings(): void {
        if (this.settingsForm.invalid) return;

        this.isSaving.set(true);
        const settings = this.settingsForm.value as SystemSettings;

        this.settingsService.updateSettings(settings)
            .pipe(finalize(() => this.isSaving.set(false)))
            .subscribe({
                next: () => {
                    this.uiFeedback.success('تم الحفظ', 'تم تحديث إعدادات النظام بنجاح');
                },
                error: (err) => {
                    this.uiFeedback.error('فشل الحفظ', err.error?.message || 'فشل حفظ الإعدادات');
                }
            });
    }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
    selector: 'app-player-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        PageHeaderComponent,
        ButtonComponent
    ],
    templateUrl: './player-form.component.html',
    styleUrls: ['./player-form.component.scss']
})
export class PlayerFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly uiFeedback = inject(UIFeedbackService);

    playerForm!: FormGroup;
    isEdit = false;
    playerId: string | null = null;

    ngOnInit(): void {
        this.initForm();
        this.playerId = this.route.snapshot.paramMap.get('id');
        if (this.playerId) {
            this.isEdit = true;
            this.loadPlayerData();
        }
    }

    private initForm(): void {
        this.playerForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]]
        });
    }

    private loadPlayerData(): void {
        // Mock data loading - in real app, fetch from API
        this.playerForm.patchValue({
            name: 'أحمد سالم',
            phone: '0501234567'
        });
    }

    onSubmit(): void {
        if (this.playerForm.valid) {
            this.uiFeedback.success('تم بنجاح', this.isEdit ? 'تم تحديث بيانات اللاعب بنجاح' : 'تم إضافة اللاعب بنجاح');
            this.router.navigate(['/captain/team']);
        }
    }

    goBack(): void {
        this.router.navigate(['/captain/team']);
    }
}

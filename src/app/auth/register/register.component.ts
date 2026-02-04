import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserRole } from '../../core/models/user.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private uiFeedback = inject(UIFeedbackService);
  private router = inject(Router);

  UserRole = UserRole;
  isLoading = false;
  currentStep: 1 | 2 = 1;

  form = {
    fullName: '',
    email: '',
    phone: '',
    age: null as number | null,
    nationalId: '',
    governorate: '',
    city: '',
    neighborhood: '',
    role: UserRole.CAPTAIN,
    password: '',
    confirmPassword: '',
    idFront: null as File | null,
    idBack: null as File | null
  };

  // Mock Location Data
  locations = [
    {
      name: 'القاهرة',
      cities: [
        { name: 'المعادي', neighborhoods: ['الحي التاسع', 'المعادي السرايات', 'زهراء المعادي'] },
        { name: 'القاهرة الجديدة', neighborhoods: ['التجمع الخامس', 'التجمع الثالث', 'الرحاب'] },
        { name: 'مصر الجديدة', neighborhoods: ['الكوربة', 'ميدان الحجاز', 'جسد السويس'] }
      ]
    },
    {
      name: 'الجيزة',
      cities: [
        { name: 'الدقي', neighborhoods: ['ميدان المساحة', 'شارع التحرير', 'البحوث'] },
        { name: 'المهندسين', neighborhoods: ['شارع أحمد عرابي', 'شارع جامعة الدول', 'ميدان سفنكس'] },
        { name: '6 أكتوبر', neighborhoods: ['الحي المتميز', 'الحي الأول', 'الحي الثامن'] }
      ]
    }
  ];

  selectedGovernorate: any = null;
  selectedCity: any = null;

  nextStep(role: UserRole): void {
    this.form.role = role;
    this.currentStep = 2;
  }

  onGovChange(): void {
    this.selectedGovernorate = this.locations.find(l => l.name === this.form.governorate);
    this.form.city = '';
    this.form.neighborhood = '';
    this.selectedCity = null;
  }

  onCityChange(): void {
    if (this.selectedGovernorate) {
      this.selectedCity = this.selectedGovernorate.cities.find((c: any) => c.name === this.form.city);
    }
    this.form.neighborhood = '';
  }

  onFileChange(event: any, field: 'idFront' | 'idBack'): void {
    const file = event.target.files[0];
    if (file) {
      this.form[field] = file;
    }
  }

  onSubmit(): void {
    if (this.form.password !== this.form.confirmPassword) {
      this.uiFeedback.error('خطأ', 'كلمات المرور غير متطابقة');
      return;
    }

    if (!this.form.idFront || !this.form.idBack) {
      this.uiFeedback.error('خطأ', 'يرجى رفع صور البطاقة');
      return;
    }

    this.isLoading = true;

    this.authService.register(this.form).subscribe({
      next: (user) => {
        this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل بنجاح!');
        this.router.navigate(['/auth/pending-approval']);
        this.isLoading = false;
      },
      error: () => {
        this.uiFeedback.error('خطأ', 'حدث خطأ أثناء التسجيل');
        this.isLoading = false;
      }
    });
  }
}

import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserRole } from '../../core/models/user.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SelectComponent, SelectOption } from '../../shared/components/select/select.component';
import { FormControlComponent } from '../../shared/components/form-control/form-control.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent, SelectComponent, FormControlComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private systemSettings = inject(SystemSettingsService);
  private uiFeedback = inject(UIFeedbackService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.checkMaintenance();
  }

  private checkMaintenance(): void {
    this.systemSettings.getMaintenanceStatus().subscribe({
      next: (status) => {
        if (status.maintenanceMode) {
          this.uiFeedback.error('غير متاح', 'التسجيل مغلق حالياً بسبب أعمال الصيانة');
          this.router.navigate(['/auth/login']);
        }
      }
    });
  }

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
    role: UserRole.PLAYER,
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
        { name: 'الالمهندسين', neighborhoods: ['شارع أحمد عرابي', 'شارع جامعة الدول', 'ميدان سفنكس'] },
        { name: '6 أكتوبر', neighborhoods: ['الحي المتميز', 'الحي الأول', 'الحي الثامن'] }
      ]
    }
  ];

  selectedGovernorate: any = null;
  selectedCity: any = null;

  get governorateOptions(): SelectOption[] {
    return this.locations.map(gov => ({ label: gov.name, value: gov.name }));
  }

  get cityOptions(): SelectOption[] {
    if (!this.selectedGovernorate) return [];
    return this.selectedGovernorate.cities.map((city: any) => ({ label: city.name, value: city.name }));
  }

  get neighborhoodOptions(): SelectOption[] {
    if (!this.selectedCity) return [];
    return this.selectedCity.neighborhoods.map((n: string) => ({ label: n, value: n }));
  }

  nextStep(role: UserRole): void {
    this.form.role = role;
    this.currentStep = 2;
  }

  onGovChange(value: string): void {
    this.selectedGovernorate = this.locations.find(l => l.name === value);
    this.form.city = '';
    this.form.neighborhood = '';
    this.selectedCity = null;
  }

  onCityChange(value: string): void {
    if (this.selectedGovernorate) {
      this.selectedCity = this.selectedGovernorate.cities.find((c: any) => c.name === value);
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
    this.cdr.detectChanges(); // Sync state before async call

    this.authService.register(this.form).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.uiFeedback.success('تم بنجاح', 'تم تقديم طلب التسجيل بنجاح!');
        this.router.navigate(['/auth/pending-approval']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.uiFeedback.error('خطأ', 'حدث خطأ أثناء التسجيل. تحقق من اتصالك بالسيرفر');
        this.cdr.detectChanges();
      }
    });
  }
}

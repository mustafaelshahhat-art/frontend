import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserRole } from '../../core/models/user.model';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';
import { AuthService } from '../../core/services/auth.service';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { LocationService } from '../../core/services/location.service';
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
  private locationService = inject(LocationService);

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
    name: '',
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

  governorateOptions: SelectOption[] = [];
  cityOptions: SelectOption[] = [];
  neighborhoodOptions: SelectOption[] = [];

  selectedGovernorate = '';
  selectedCity = '';

  nextStep(role: UserRole): void {
    this.form.role = role;
    this.currentStep = 2;
    if (this.governorateOptions.length === 0) {
      this.loadGovernorates();
    }
  }

  private loadGovernorates(): void {
    this.locationService.getGovernorates().subscribe({
      next: (govs) => {
        this.governorateOptions = govs.map(g => ({ label: g, value: g }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.governorateOptions = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadCities(governorate: string): void {
    this.locationService.getCities(governorate).subscribe({
      next: (cities) => {
        this.cityOptions = cities.map(c => ({ label: c, value: c }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.cityOptions = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadNeighborhoods(city: string): void {
    this.locationService.getDistricts(city).subscribe({
      next: (districts) => {
        this.neighborhoodOptions = districts.map(d => ({ label: d, value: d }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.neighborhoodOptions = [];
        this.cdr.detectChanges();
      }
    });
  }

  onGovChange(value: string): void {
    this.form.governorate = value;  // Update form value
    this.selectedGovernorate = value;
    this.form.city = '';
    this.form.neighborhood = '';
    this.selectedCity = '';
    this.cityOptions = [];
    this.neighborhoodOptions = [];
    if (value) {
      this.loadCities(value);
    }
    this.cdr.detectChanges();
  }

  onCityChange(value: string): void {
    this.form.city = value;  // Update form value
    this.selectedCity = value;
    this.form.neighborhood = '';
    this.neighborhoodOptions = [];
    if (value) {
      this.loadNeighborhoods(value);
    }
    this.cdr.detectChanges();
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

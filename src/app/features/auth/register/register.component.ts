import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { LocationService } from '../../../core/services/location.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { FormControlComponent } from '../../../shared/components/form-control/form-control.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IconComponent, CommonModule, FormsModule, RouterModule, ButtonComponent, SelectComponent, FormControlComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private systemSettings = inject(SystemSettingsService);
  private uiFeedback = inject(UIFeedbackService);
  private router = inject(Router);
  private locationService = inject(LocationService);

  isLoading = signal(false);
  isPageReady = signal(false);

  form = {
    name: signal(''),
    email: signal(''),
    phone: signal(''),
    age: signal<number | null>(null),
    nationalId: signal(''),
    governorate: signal(''),
    city: signal(''),
    neighborhood: signal(''),

    password: signal(''),
    confirmPassword: signal(''),
    idFront: signal<File | null>(null),
    idBack: signal<File | null>(null)
  };

  governorateOptions = signal<SelectOption[]>([]);
  cityOptions = signal<SelectOption[]>([]);
  neighborhoodOptions = signal<SelectOption[]>([]);

  selectedGovernorate = signal('');
  selectedCity = signal('');

  ngOnInit(): void {
    this.checkMaintenance();
    this.loadGovernorates();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.isPageReady.set(true);
    });
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



  private loadGovernorates(): void {
    this.locationService.getGovernorates().subscribe({
      next: (govs) => {
        this.governorateOptions.set(govs.map(g => ({ label: g, value: g })));
      },
      error: () => {
        this.governorateOptions.set([]);
      }
    });
  }

  private loadCities(governorate: string): void {
    this.locationService.getCities(governorate).subscribe({
      next: (cities) => {
        this.cityOptions.set(cities.map(c => ({ label: c, value: c })));
      },
      error: () => {
        this.cityOptions.set([]);
      }
    });
  }

  private loadNeighborhoods(city: string): void {
    this.locationService.getDistricts(city).subscribe({
      next: (districts) => {
        this.neighborhoodOptions.set(districts.map(d => ({ label: d, value: d })));
      },
      error: () => {
        this.neighborhoodOptions.set([]);
      }
    });
  }

  onGovChange(value: string): void {
    this.form.governorate.set(value);
    this.selectedGovernorate.set(value);
    this.form.city.set('');
    this.form.neighborhood.set('');
    this.selectedCity.set('');
    this.cityOptions.set([]);
    this.neighborhoodOptions.set([]);
    if (value) {
      this.loadCities(value);
    }
  }

  onCityChange(value: string): void {
    this.form.city.set(value);
    this.selectedCity.set(value);
    this.form.neighborhood.set('');
    this.neighborhoodOptions.set([]);
    if (value) {
      this.loadNeighborhoods(value);
    }
  }

  onFileChange(event: Event, field: 'idFront' | 'idBack'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.form[field].set(file);
    }
  }

  onSubmit(): void {
    if (this.form.password() !== this.form.confirmPassword()) {
      this.uiFeedback.error('كلمة المرور غير متطابقة', 'كلمة المرور وتأكيدها غير متطابقين. يرجى إعادة الإدخال.');
      return;
    }

    if (!this.form.idFront() || !this.form.idBack()) {
      this.uiFeedback.error('بطاقة مطلوبة', 'يرجى رفع صور بطاقة الهوية (الوجه والظهر) لإتمام التسجيل.');
      return;
    }

    this.isLoading.set(true);

    const formData = {
      name: this.form.name().trim(),
      email: this.form.email().trim(),
      phone: this.form.phone()?.trim(),
      age: this.form.age(),
      nationalId: this.form.nationalId()?.trim(),
      governorate: this.form.governorate()?.trim(),
      city: this.form.city()?.trim(),
      neighborhood: this.form.neighborhood()?.trim(),
      role: 'Player',
      password: this.form.password().trim(),
      confirmPassword: this.form.confirmPassword().trim(),
      idFront: this.form.idFront(),
      idBack: this.form.idBack()
    };

    // Note: authService.register expects original object structure
    // We map signals to values here.
    this.authService.register(formData).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Use plain text email to avoid encoding issues
        this.router.navigate(['/auth/verify-email'], {
          queryParams: {
            email: formData.email,
            registered: 'true'
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uiFeedback.error('فشل التسجيل', err.error?.message || 'حدث خطأ أثناء التسجيل. تحقق من اتصالك بالسيرفر');
      }
    });
  }
}

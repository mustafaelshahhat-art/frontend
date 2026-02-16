import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { UIFeedbackService } from '../../../shared/services/ui-feedback.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemSettingsService } from '../../../core/services/system-settings.service';
import { LocationService, GovernorateDto, CityDto, AreaDto } from '../../../core/services/location.service';
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
    governorateId: signal(''),
    cityId: signal(''),
    areaId: signal(''),

    password: signal(''),
    confirmPassword: signal(''),
    idFront: signal<File | null>(null),
    idBack: signal<File | null>(null)
  };

  governorateOptions = signal<SelectOption[]>([]);
  cityOptions = signal<SelectOption[]>([]);
  areaOptions = signal<SelectOption[]>([]);

  isLoadingCities = signal(false);
  isLoadingAreas = signal(false);

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
      next: (govs: GovernorateDto[]) => {
        this.governorateOptions.set(govs.map(g => ({ label: g.nameAr, value: g.id })));
      },
      error: () => {
        this.governorateOptions.set([]);
      }
    });
  }

  private loadCities(governorateId: string): void {
    this.isLoadingCities.set(true);
    this.locationService.getCities(governorateId).subscribe({
      next: (cities: CityDto[]) => {
        this.cityOptions.set(cities.map(c => ({ label: c.nameAr, value: c.id })));
        this.isLoadingCities.set(false);
      },
      error: () => {
        this.cityOptions.set([]);
        this.isLoadingCities.set(false);
      }
    });
  }

  private loadAreas(cityId: string): void {
    this.isLoadingAreas.set(true);
    this.locationService.getAreas(cityId).subscribe({
      next: (areas: AreaDto[]) => {
        this.areaOptions.set(areas.map(a => ({ label: a.nameAr, value: a.id })));
        this.isLoadingAreas.set(false);
      },
      error: () => {
        this.areaOptions.set([]);
        this.isLoadingAreas.set(false);
      }
    });
  }

  onGovChange(value: string): void {
    this.form.governorateId.set(value);
    this.form.cityId.set('');
    this.form.areaId.set('');
    this.cityOptions.set([]);
    this.areaOptions.set([]);
    if (value) {
      this.loadCities(value);
    }
  }

  onCityChange(value: string): void {
    this.form.cityId.set(value);
    this.form.areaId.set('');
    this.areaOptions.set([]);
    if (value) {
      this.loadAreas(value);
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
      governorateId: this.form.governorateId() || null,
      cityId: this.form.cityId() || null,
      areaId: this.form.areaId() || null,
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

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { UIFeedbackService } from '../../shared/services/ui-feedback.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        ButtonComponent
    ],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    private readonly uiFeedback = inject(UIFeedbackService);

    settings = {
        appNameAr: 'بطولة رمضان الكبرى ٢٠٢٤',
        appNameEn: 'Ramadan Grand Tournament 2024',
        maintenanceMode: false,
        registrationOpen: true,
        allowTeamRegistration: true,
        maxPlayersPerTeam: 15,
        tournamentStartDate: '2024-03-10',
        systemTheme: 'dark'
    };

    ngOnInit(): void { }

    saveSettings(): void {
        console.log('Settings saved:', this.settings);
        this.uiFeedback.success('تم الحفظ', 'تم حفظ الإعدادات بنجاح');
    }
}

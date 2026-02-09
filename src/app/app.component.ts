import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { GlobalAlertsComponent } from './shared/components/global-alerts/global-alerts.component';
import { GlobalConfirmDialogComponent } from './shared/components/global-confirm-dialog/global-confirm-dialog.component';
import { GlobalLoadingComponent } from './shared/components/global-loading/global-loading.component';
import { RealTimeUpdateService } from './core/services/real-time-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    GlobalAlertsComponent,
    GlobalConfirmDialogComponent,
    GlobalLoadingComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly title = signal('ramadan-tournament');
  // Initialize Real-Time Service globally
  private readonly realTimeUpdate = inject(RealTimeUpdateService);
}

import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { GlobalAlertsComponent } from './shared/components/global-alerts/global-alerts.component';
import { GlobalConfirmDialogComponent } from './shared/components/global-confirm-dialog/global-confirm-dialog.component';
import { GlobalLoadingComponent } from './shared/components/global-loading/global-loading.component';

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
  protected readonly title = signal('Kora Zone 365');
  // PERF: RealTimeUpdateService removed from root — now lazily instantiated
  // via NotificationService in authenticated layout chunks only.
  // This eliminates @microsoft/signalr (~50KB) + 4 stores from the initial bundle.
}

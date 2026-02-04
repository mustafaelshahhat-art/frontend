import { Component, signal } from '@angular/core';
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
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  protected readonly title = signal('ramadan-tournament');
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'لا توجد بيانات';
  @Input() description = 'لم يتم العثور على أي عناصر';
  @Input() actionLabel?: string;
  @Input() onAction?: () => void;

  handleAction(): void {
    if (this.onAction) {
      this.onAction();
    }
  }
}

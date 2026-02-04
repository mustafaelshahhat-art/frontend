import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'لا توجد بيانات';
  @Input() description: string = 'لم يتم العثور على أي عناصر';
  @Input() actionLabel?: string;
  @Input() onAction?: () => void;

  handleAction(): void {
    if (this.onAction) {
      this.onAction();
    }
  }
}

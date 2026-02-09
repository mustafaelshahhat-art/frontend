import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule, ButtonComponent],
    templateUrl: './page-header.component.html',
    styleUrls: ['./page-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
    @Input() title = '';
    @Input() subtitle = '';
    @Input() showGradient = false;
    @Input() showBack = false;
    @Output() back = new EventEmitter<void>();
}

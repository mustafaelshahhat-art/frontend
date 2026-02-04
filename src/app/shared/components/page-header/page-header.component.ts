import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule, ButtonComponent],
    templateUrl: './page-header.component.html',
    styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
    @Input() showGradient: boolean = false;
    @Input() showBack: boolean = false;
    @Output() back = new EventEmitter<void>();
}

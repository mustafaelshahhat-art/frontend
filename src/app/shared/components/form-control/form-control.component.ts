import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-form-control',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './form-control.component.html',
    styleUrls: ['./form-control.component.scss']
})
export class FormControlComponent {
    @Input() label?: string;
    @Input() error?: string;
    @Input() hint?: string;
    @Input() iconLeft?: string;
    @Input() iconRight?: string;
}

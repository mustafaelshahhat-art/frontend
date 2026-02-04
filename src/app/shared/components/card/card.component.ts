import { Component, Input, ContentChild, ElementRef, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss']
})
export class CardComponent implements AfterContentInit {
    @Input() variant: 'default' | 'glass' | 'featured' = 'default';
    @Input() title?: string;
    @Input() subtitle?: string;
    @Input() hover = false;
    @Input() padding = true;
    @Input() isClickable = false;
    @Input() icon?: string;

    @ContentChild('footer') footerContent?: ElementRef;
    hasFooter = false;

    ngContentSelectAll(selector: string): boolean {
        // This is a simplified check, in real Angular we might use @ContentChildren
        return false;
    }

    ngAfterContentInit() {
        // Simple way to check for projected content if needed, 
        // but usually selective ng-content is handled by CSS or presence of elements
        this.hasFooter = true; // For now assuming if they use it they want a footer
    }
}

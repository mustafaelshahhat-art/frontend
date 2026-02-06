import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-smart-image',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './smart-image.component.html',
    styleUrls: ['./smart-image.component.scss']
})
export class SmartImageComponent implements OnInit, OnChanges {
    @Input() src: string | null | undefined;
    @Input() type: 'avatar' | 'id' | 'team' | 'referee' | 'tournament' = 'avatar';
    @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom' = 'md';
    @Input() alt: string = '';
    @Input() rounded: boolean = true;
    @Input() showBorder: boolean = false;
    @Input() customClass: string = '';
    @Input() initials: string = '';

    fullUrl: string | null = null;
    hasError: boolean = false;
    isLoaded: boolean = false;

    ngOnInit() {
        this.processUrl();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['src']) {
            this.processUrl();
        }
    }

    processUrl() {
        this.hasError = false;
        this.isLoaded = false;

        if (!this.src) {
            this.fullUrl = null;
            return;
        }

        // Handle full URLs
        if (this.src.startsWith('http') || this.src.startsWith('data:')) {
            this.fullUrl = this.src;
        } else {
            // Handle relative URLs from backend (e.g., /uploads/...)
            const baseUrl = environment.imageBaseUrl;
            const path = this.src.startsWith('/') ? this.src : `/${this.src}`;
            this.fullUrl = `${baseUrl}${path}`;
        }
    }

    onLoad() {
        this.isLoaded = true;
    }

    onError() {
        this.hasError = true;
        this.fullUrl = null;
    }

    get containerClasses(): string {
        return `smart-image-container ${this.size} ${this.type} ${this.rounded ? 'rounded' : ''} ${this.showBorder ? 'bordered' : ''} ${this.customClass}`;
    }

    get placeholderIcon(): string {
        switch (this.type) {
            case 'avatar': return 'person';
            case 'referee': return 'person_search';
            case 'team': return 'shield';
            case 'id': return 'badge';
            case 'tournament': return 'emoji_events';
            default: return 'image';
        }
    }

    get placeholderLabel(): string {
        switch (this.type) {
            case 'id': return 'لم يتم الرفع';
            case 'team': return 'شعار الفريق';
            default: return '';
        }
    }
}

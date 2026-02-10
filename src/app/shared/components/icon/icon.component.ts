import { Component, Input, OnChanges, SimpleChanges, HostBinding, ChangeDetectionStrategy, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { IconService } from './icon.service';
import { Observable, of } from 'rxjs';
import { SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-icon',
    standalone: true,
    imports: [CommonModule, HttpClientModule],
    template: `
    <span [innerHTML]="svgContent$ | async" 
          [class.rtl-mirror]="rtlFlip"
          class="app-icon-inner">
    </span>
  `,
    styleUrls: ['./icon.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent implements OnChanges {
    @Input() name: string | null | undefined;
    @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
    @Input() rtlFlip: boolean = false; // Manually flip for RTL if needed, or binding from parent

    private iconService = inject(IconService);
    svgContent$: Observable<SafeHtml | null> = of(null);

    @HostBinding('class') get hostClasses() {
        return `app-icon icon-${this.size}`;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['name'] && this.name) {
            this.svgContent$ = this.iconService.getIcon(this.name);
        }
    }
}

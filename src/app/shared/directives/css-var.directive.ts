import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Directive to set CSS custom properties from component data.
 * This keeps dynamic values out of inline styles while allowing
 * CSS-driven styling based on data values.
 * 
 * Usage:
 * <div [cssVar]="{ '--progress-percent': progressValue, '--team-color': teamColor }">
 */
@Directive({
  selector: '[cssVar]',
  standalone: true
})
export class CssVarDirective implements OnChanges {
  @Input() cssVar: Record<string, string | number> = {};

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cssVar']) {
      this.updateCssVars();
    }
  }

  private updateCssVars(): void {
    if (!this.cssVar) return;
    
    Object.entries(this.cssVar).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        this.el.nativeElement.style.setProperty(key, String(value));
      } else {
        this.el.nativeElement.style.removeProperty(key);
      }
    });
  }
}

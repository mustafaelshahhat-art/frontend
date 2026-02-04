import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { Permission } from '../../core/permissions/permissions.model';
import { PermissionsService } from '../../core/services/permissions.service';

@Directive({
    selector: '[appHasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit {
    private templateRef = inject(TemplateRef<any>);
    private viewContainer = inject(ViewContainerRef);
    private permissionsService = inject(PermissionsService);

    private requiredPermission: Permission | Permission[] | null = null;
    private isHidden = true;

    @Input() set appHasPermission(permission: Permission | Permission[] | string | string[]) {
        this.requiredPermission = permission as Permission | Permission[];
        this.updateView();
    }

    ngOnInit(): void {
        this.updateView();
    }

    private updateView(): void {
        if (!this.requiredPermission) {
            this.show();
            return;
        }

        let hasAccess = false;
        if (Array.isArray(this.requiredPermission)) {
            hasAccess = this.permissionsService.hasAnyPermission(this.requiredPermission);
        } else {
            hasAccess = this.permissionsService.hasPermission(this.requiredPermission);
        }

        if (hasAccess && this.isHidden) {
            this.show();
        } else if (!hasAccess && !this.isHidden) {
            this.hide();
        }
    }

    private show(): void {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.isHidden = false;
    }

    private hide(): void {
        this.viewContainer.clear();
        this.isHidden = true;
    }
}

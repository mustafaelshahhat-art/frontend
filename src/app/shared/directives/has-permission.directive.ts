import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Permission } from '../../core/permissions/permissions.model';
import { PermissionsService } from '../../core/services/permissions.service';

@Directive({
    selector: '[appHasPermission]',
    standalone: true
})
export class HasPermissionDirective {
    private templateRef = inject(TemplateRef<unknown>);
    private viewContainer = inject(ViewContainerRef);
    private permissionsService = inject(PermissionsService);

    @Input() set appHasPermission(permission: Permission | Permission[]) {
        const isAuthorized = Array.isArray(permission)
            ? this.permissionsService.hasAny(permission)
            : this.permissionsService.has(permission);

        this.viewContainer.clear();
        if (isAuthorized) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        }
    }
}

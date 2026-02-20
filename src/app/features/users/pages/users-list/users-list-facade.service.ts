import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { User, UserStatus } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { UserStore } from '../../../../core/stores/user.store';
import { UIFeedbackService } from '../../../../shared/services/ui-feedback.service';

@Injectable({ providedIn: 'root' })
export class UsersListFacade {
    private readonly userService = inject(UserService);
    private readonly userStore = inject(UserStore);
    private readonly uiFeedback = inject(UIFeedbackService);

    async loadUsers(): Promise<void> {
        this.userStore.setLoading(true);
        try {
            const data = await firstValueFrom(this.userService.getUsers(1, 500));
            this.userStore.setUsers(data.items);
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string }; message?: string };
            this.userStore.setError(httpErr.error?.message || httpErr.message || 'Error');
            this.userStore.setLoading(false);
        }
    }

    async suspendUser(user: User, isLastAdmin: boolean): Promise<void> {
        if (isLastAdmin) {
            this.uiFeedback.error('غير مسموح', 'لا يمكن إيقاف آخر مشرف في النظام');
            return;
        }

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'إيقاف المستخدم',
            `هل تريد إيقاف المستخدم "${user.name}"؟`,
            'إيقاف',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.userService.suspendUser(user.id));
            this.uiFeedback.success('تم الإيقاف', 'تم إيقاف المستخدم بنجاح');
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الإيقاف', httpErr.error?.message || 'تعذّر إيقاف المستخدم. يرجى المحاولة مرة أخرى.');
        }
    }

    async approveUser(user: User): Promise<void> {
        const isSuspended = user.status === UserStatus.SUSPENDED;
        const title = isSuspended ? 'تفعيل الحساب' : 'تفعيل المستخدم';
        const message = isSuspended
            ? `هل تريد إعادة تفعيل حساب المستخدم "${user.name}"؟`
            : `هل تريد تفعيل حساب المستخدم "${user.name}" والموافقة على انضمامه؟`;
        const actionLabel = isSuspended ? 'تفعيل الآن' : 'موافقة وتفعيل';

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(title, message, actionLabel, 'info'));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.userService.activateUser(user.id));
            this.uiFeedback.success('تم التفعيل', 'تم تفعيل حساب المستخدم بنجاح');
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل التفعيل', httpErr.error?.message || 'تعذّر تفعيل حساب المستخدم. يرجى المحاولة مرة أخرى.');
        }
    }

    async deleteUser(user: User, isLastAdmin: boolean): Promise<void> {
        if (isLastAdmin) {
            this.uiFeedback.error('غير مسموح', 'لا يمكن حذف آخر مشرف في النظام');
            return;
        }

        const confirmed = await firstValueFrom(this.uiFeedback.confirm(
            'حذف المستخدم',
            `هل تريد حذف المستخدم "${user.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
            'حذف نهائي',
            'danger'
        ));
        if (!confirmed) return;

        try {
            await firstValueFrom(this.userService.deleteUser(user.id));
            this.uiFeedback.success('تم الحذف', 'تم حذف المستخدم بنجاح');
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الحذف', httpErr.error?.message || 'تعذّر حذف المستخدم. يرجى المحاولة مرة أخرى.');
        }
    }

    async submitAdminForm(
        data: { name: string; email: string; password: string; status: 'Active' | 'Suspended' },
        setSaving: (v: boolean) => void,
        onSuccess: () => void
    ): Promise<void> {
        setSaving(true);
        try {
            const newAdmin = await firstValueFrom(this.userService.createAdmin(data));
            this.uiFeedback.success('تم الإنشاء', `تم إنشاء المشرف "${newAdmin.name}" بنجاح`);
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الإنشاء', httpErr.error?.message || 'تعذّر إنشاء حساب المشرف. يرجى مراجعة البيانات والمحاولة مرة أخرى.');
        } finally {
            setSaving(false);
        }
    }

    async submitCreatorForm(
        data: { name: string; email: string; password: string; status: 'Active' | 'Suspended' },
        setSaving: (v: boolean) => void,
        onSuccess: () => void
    ): Promise<void> {
        setSaving(true);
        try {
            const user = await firstValueFrom(this.userService.createTournamentCreator(data));
            this.uiFeedback.success('تم الإنشاء', `تم إنشاء منشئ البطولة "${user.name}" بنجاح`);
            onSuccess();
        } catch (err: unknown) {
            const httpErr = err as { error?: { message?: string } };
            this.uiFeedback.error('فشل الإنشاء', httpErr.error?.message || 'تعذّر إنشاء الحساب. يرجى مراجعة البيانات والمحاولة مرة أخرى.');
        } finally {
            setSaving(false);
        }
    }
}

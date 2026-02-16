import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UIFeedbackService, FeedbackType } from './ui-feedback.service';

export interface AppError {
    code: string;
    message: string;
    details?: unknown;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {
    private uiFeedback = inject(UIFeedbackService);

    /**
     * Handle HTTP errors and show appropriate toast messages
     */
    handleHttpError(error: HttpErrorResponse): AppError {
        const appError = this.parseHttpError(error);

        // Suppress toast for errors handled via redirect (401/403)
        // and non-fatal 404s (data misses)
        const shouldSuppressToast =
            error.status === 401 ||
            error.status === 403 ||
            (error.status === 404 && appError.code === 'NOT_FOUND');

        if (!shouldSuppressToast) {
            this.showContextualToast(appError, error.status);
        } else {
            console.warn(`[Suppressed Toast for Status ${error.status}] ${appError.message}`);
        }

        this.logError(appError);
        return appError;
    }

    /**
     * Handle generic errors
     */
    handleError(error: unknown, context?: string): AppError {
        const err = error as { message?: string; stack?: string };
        const message = err?.message || (typeof error === 'string' ? error : 'حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');

        const appError: AppError = {
            code: 'GENERIC_ERROR',
            message: message,
            details: { context, stack: err?.stack },
            timestamp: new Date()
        };

        // Suppress Angular internal errors from UI
        const isTechnicalError = message.includes('NG0100') ||
            message.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
            message.includes('NG0');

        if (!isTechnicalError) {
            this.uiFeedback.error('خطأ غير متوقع', 'حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        } else {
            console.warn(`[Technical suppressed from UI] ${message}`, error);
        }

        this.logError(appError);
        return appError;
    }

    /**
     * Parse HTTP error response into structured AppError
     */
    private parseHttpError(error: HttpErrorResponse): AppError {
        let code: string;
        let message: string;

        switch (error.status) {
            case 0: {
                // Distinguish CORS rejection from genuine network failure.
                // CORS blocks produce status 0 + ProgressEvent error + a valid URL.
                // Real offline produces status 0 + no URL or navigator.onLine === false.
                const isCors = error.url && error.error instanceof ProgressEvent && navigator.onLine;
                if (isCors) {
                    code = 'CORS_ERROR';
                    message = 'تم حظر الطلب بواسطة سياسة المتصفح (CORS). تأكد من تشغيل الخادم وإعدادات CORS.';
                } else {
                    code = 'NETWORK_ERROR';
                    message = 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
                }
                break;
            }
            case 401:
                code = error.error?.code || 'UNAUTHORIZED';
                message = error.error?.message || 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.';
                break;
            case 403:
                code = error.error?.code || 'FORBIDDEN';
                message = error.error?.message || 'ليس لديك الصلاحية اللازمة لتنفيذ هذا الإجراء. تواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.';
                break;
            case 404:
                code = 'NOT_FOUND';
                message = error.error?.message || 'العنصر المطلوب غير موجود أو ربما تم حذفه.';
                break;
            case 400:
            case 422: {
                code = error.error?.code || (error.status === 400 ? 'BAD_REQUEST' : 'VALIDATION_ERROR');
                const validationErrors = error.error?.details || error.error?.errors;
                if (validationErrors && typeof validationErrors === 'object') {
                    const allErrors: string[] = [];
                    Object.values(validationErrors as object).forEach(err => {
                        if (Array.isArray(err)) {
                            allErrors.push(...err);
                        } else if (typeof err === 'string') {
                            allErrors.push(err);
                        }
                    });

                    if (allErrors.length > 0) {
                        // Join multiple errors with newline bullet points for readability
                        message = allErrors.length === 1 
                            ? allErrors[0] 
                            : allErrors.map(e => `• ${e}`).join('\n');
                    } else {
                        message = error.error?.message || 'يرجى مراجعة البيانات المدخلة والتأكد من صحتها.';
                    }
                } else {
                    message = error.error?.message || 'يرجى مراجعة البيانات المدخلة والتأكد من صحتها.';
                }
                break;
            }
            case 409:
                code = error.error?.code || 'CONFLICT';
                message = error.error?.message || 'لا يمكن تنفيذ هذا الإجراء بسبب تعارض مع البيانات الحالية.';
                break;
            case 429:
                code = 'TOO_MANY_REQUESTS';
                message = 'تم إرسال عدد كبير من الطلبات. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
                break;
            case 500:
                code = 'SERVER_ERROR';
                message = error.error?.message || 'حدث خطأ في الخادم أثناء معالجة طلبك. يرجى المحاولة مرة أخرى بعد قليل.';
                break;
            case 502:
            case 503:
            case 504:
                code = 'SERVICE_UNAVAILABLE';
                message = 'الخدمة غير متاحة حالياً بسبب أعمال صيانة أو ضغط مؤقت. يرجى المحاولة بعد دقائق.';
                break;
            default:
                code = error.error?.code || 'UNKNOWN_ERROR';
                message = error.error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.';
        }

        return {
            code,
            message,
            details: {
                status: error.status,
                statusText: error.statusText,
                url: error.url,
                error: error.error
            },
            timestamp: new Date()
        };
    }

    /**
     * Show contextual toast with appropriate title and type based on error code/status
     */
    private showContextualToast(error: AppError, status: number): void {
        const { title, type } = this.getToastMeta(error.code, status);
        if (type === 'error') {
            this.uiFeedback.error(title, error.message);
        } else if (type === 'warning') {
            this.uiFeedback.warning(title, error.message);
        } else {
            this.uiFeedback.info(title, error.message);
        }
    }

    /**
     * Map error code to contextual Arabic title and toast type
     */
    private getToastMeta(code: string, status: number): { title: string; type: FeedbackType } {
        switch (code) {
            case 'NETWORK_ERROR':
                return { title: 'مشكلة في الاتصال', type: 'error' };
            case 'UNAUTHORIZED':
                return { title: 'انتهت الجلسة', type: 'warning' };
            case 'FORBIDDEN':
                return { title: 'غير مصرح', type: 'warning' };
            case 'NOT_FOUND':
                return { title: 'غير موجود', type: 'warning' };
            case 'BAD_REQUEST':
                return { title: 'بيانات غير صحيحة', type: 'error' };
            case 'VALIDATION_ERROR':
                return { title: 'خطأ في البيانات', type: 'error' };
            case 'CONFLICT':
                return { title: 'تعارض في البيانات', type: 'warning' };
            case 'TOO_MANY_REQUESTS':
                return { title: 'طلبات كثيرة', type: 'warning' };
            case 'SERVER_ERROR':
                return { title: 'خطأ في الخادم', type: 'error' };
            case 'SERVICE_UNAVAILABLE':
                return { title: 'الخدمة غير متاحة', type: 'warning' };
            case 'EMAIL_NOT_VERIFIED':
                return { title: 'البريد غير مفعّل', type: 'warning' };
            default:
                return status >= 500 
                    ? { title: 'خطأ في الخادم', type: 'error' }
                    : { title: 'حدث خطأ', type: 'error' };
        }
    }

    /**
     * Log error for debugging
     */
    private logError(error: AppError): void {
        console.error(`[${error.code}] ${error.message}`, error.details);
    }

    /**
     * Get user-friendly message for common error codes
     */
    getErrorMessage(code: string): string {
        const messages: Record<string, string> = {
            'CORS_ERROR': 'تم حظر الطلب بواسطة سياسة CORS. تأكد من تشغيل الخادم.',
            'NETWORK_ERROR': 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
            'UNAUTHORIZED': 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
            'FORBIDDEN': 'ليس لديك الصلاحية اللازمة لتنفيذ هذا الإجراء.',
            'NOT_FOUND': 'العنصر المطلوب غير موجود.',
            'VALIDATION_ERROR': 'يرجى مراجعة البيانات المدخلة والتأكد من صحتها.',
            'CONFLICT': 'لا يمكن تنفيذ الإجراء بسبب تعارض في البيانات.',
            'SERVER_ERROR': 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.',
            'TOO_MANY_REQUESTS': 'تم إرسال عدد كبير من الطلبات. يرجى الانتظار.',
            'GENERIC_ERROR': 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
        };
        return messages[code] || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
    }
}

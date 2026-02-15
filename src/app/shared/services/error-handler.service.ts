import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UIFeedbackService } from './ui-feedback.service';

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
    /**
     * Handle HTTP errors and show appropriate toast messages
     */
    handleHttpError(error: HttpErrorResponse): AppError {
        const appError = this.parseHttpError(error);

        // DO NOT show toast for errors that don't "stop" or break the user flow, 
        // or errors that are handled automatically (like redirects)
        const shouldSuppressToast =
            error.status === 401 || // Handled by redirect to login
            error.status === 403 || // Handled by redirect to unauthorized
            (error.status === 404 && appError.code === 'NOT_FOUND'); // Often non-fatal data misses

        if (!shouldSuppressToast) {
            this.showErrorToast(appError);
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
        const message = err?.message || (typeof error === 'string' ? error : 'حدث خطأ غير متوقع');

        const appError: AppError = {
            code: 'GENERIC_ERROR',
            message: message,
            details: { context, stack: err?.stack },
            timestamp: new Date()
        };

        // Suppress NG0100 errors and other technical developer errors from UI
        const isTechnicalError = message.includes('NG0100') ||
            message.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
            message.includes('NG0'); // Catch-all for other Angular internal codes if needed

        if (!isTechnicalError) {
            this.showErrorToast(appError);
        } else {
            console.warn(`[Technical suppressed from UI] ${message}`, error);
        }

        this.logError(appError);
        return appError;
    }

    /**
     * Parse HTTP error response
     */
    private parseHttpError(error: HttpErrorResponse): AppError {
        let code: string;
        let message: string;

        switch (error.status) {
            case 0:
                code = 'NETWORK_ERROR';
                message = 'لا يمكن الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
                break;
            case 401:
                code = error.error?.code || 'UNAUTHORIZED';
                message = error.error?.message || 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.';
                break;
            case 403:
                code = error.error?.code || 'FORBIDDEN';
                message = error.error?.message || 'ليس لديك صلاحية للوصول إلى هذا المورد.';
                break;
            case 404:
                code = 'NOT_FOUND';
                message = error.error?.message || 'المورد المطلوب غير موجود.';
                break;
            case 400:
            case 422:
                code = error.error?.code || (error.status === 400 ? 'BAD_REQUEST' : 'VALIDATION_ERROR');
                // Check for detailed validation errors (standard ASP.NET Core or custom)
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
                        message = allErrors.join(' | ');
                    } else {
                        message = error.error?.message || 'خطأ في البيانات';
                    }
                } else {
                    message = error.error?.message || (error.status === 400 ? 'طلب غير صالح' : 'خطأ في التحقق من البيانات');
                }
                break;
            case 429:
                code = 'TOO_MANY_REQUESTS';
                message = 'عدد كبير جداً من الطلبات. يرجى المحاولة لاحقاً.';
                break;
            case 500:
                code = 'SERVER_ERROR';
                message = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
                break;
            case 502:
            case 503:
            case 504:
                code = 'SERVICE_UNAVAILABLE';
                message = 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.';
                break;
            default:
                code = error.error?.code || 'UNKNOWN_ERROR';
                message = error.error?.message || 'حدث خطأ غير متوقع';
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
     * Show error toast
     */
    private showErrorToast(error: AppError): void {
        this.uiFeedback.error('حدث خطأ', error.message);
    }

    /**
     * Log error for debugging
     */
    private logError(error: AppError): void {
        console.error(`[${error.code}] ${error.message}`, error.details);
        // PROD-DEBUG: Log raw error for model binding debugging
        if (error.details && (error.details as any).error) {
            console.log('RAW SERVER ERROR:', (error.details as any).error);
        }
    }

    /**
     * Get user-friendly message for common errors
     */
    getErrorMessage(code: string): string {
        const messages: Record<string, string> = {
            'NETWORK_ERROR': 'لا يمكن الاتصال بالخادم',
            'UNAUTHORIZED': 'يرجى تسجيل الدخول',
            'FORBIDDEN': 'غير مصرح لك بهذا الإجراء',
            'NOT_FOUND': 'العنصر غير موجود',
            'VALIDATION_ERROR': 'يرجى التحقق من البيانات المدخلة',
            'SERVER_ERROR': 'خطأ في الخادم',
            'GENERIC_ERROR': 'حدث خطأ غير متوقع'
        };
        return messages[code] || 'حدث خطأ';
    }
}

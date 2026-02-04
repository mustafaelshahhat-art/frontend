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
    handleHttpError(error: HttpErrorResponse): AppError {
        const appError = this.parseHttpError(error);
        this.showErrorToast(appError);
        this.logError(appError);
        return appError;
    }

    /**
     * Handle generic errors
     */
    handleError(error: Error, context?: string): AppError {
        const appError: AppError = {
            code: 'GENERIC_ERROR',
            message: error.message || 'حدث خطأ غير متوقع',
            details: { context, stack: error.stack },
            timestamp: new Date()
        };
        this.showErrorToast(appError);
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
            case 400:
                code = 'BAD_REQUEST';
                message = error.error?.message || 'طلب غير صالح';
                break;
            case 401:
                code = 'UNAUTHORIZED';
                message = 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.';
                break;
            case 403:
                code = 'FORBIDDEN';
                message = 'ليس لديك صلاحية للوصول إلى هذا المورد.';
                break;
            case 404:
                code = 'NOT_FOUND';
                message = 'المورد المطلوب غير موجود.';
                break;
            case 409:
                code = 'CONFLICT';
                message = error.error?.message || 'تعارض في البيانات';
                break;
            case 422:
                code = 'VALIDATION_ERROR';
                message = error.error?.message || 'خطأ في البيانات المدخلة';
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
                code = 'UNKNOWN_ERROR';
                message = 'حدث خطأ غير متوقع';
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

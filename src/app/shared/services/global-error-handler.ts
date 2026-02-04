import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Global Error Handler for Angular
 * Catches unhandled errors throughout the application
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private errorHandlerService = inject(ErrorHandlerService);

    handleError(error: Error): void {
        // Log to console in development
        console.error('Global Error:', error);

        // Handle the error using our service
        this.errorHandlerService.handleError(error, 'GlobalErrorHandler');

        // Optionally: Send to error tracking service (e.g., Sentry)
        // this.sendToErrorTracking(error);
    }
}

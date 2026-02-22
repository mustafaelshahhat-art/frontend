import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeAgo',
    standalone: true,
    pure: true // PERF-FIX: pure pipe avoids recalculation on every change detection cycle.
    // For live-updating "time ago" text, components should use a signal/interval to
    // periodically reassign the date value (e.g., every 60s), which triggers pure pipe re-evaluation.
})
export class TimeAgoPipe implements PipeTransform {
    transform(value: string | Date | undefined | null): string {
        if (!value) return '';

        const date = typeof value === 'string' ? new Date(value) : value;
        const now = new Date();

        // Ensure we are comparing UTC to UTC or Local to Local
        // The server sends ISO strings (UTC), new Date(value) parses them correctly.
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 30) return 'الآن';

        if (diffInSeconds < 60) {
            return 'منذ أقل من دقيقة';
        }

        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) {
            return this.formatArabic(minutes, 'دقيقة', 'دقيقتين', 'دقائق');
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return this.formatArabic(hours, 'ساعة', 'ساعتين', 'ساعات');
        }

        const days = Math.floor(hours / 24);
        if (days < 30) {
            return this.formatArabic(days, 'يوم', 'يومين', 'أيام');
        }

        const months = Math.floor(days / 30);
        if (months < 12) {
            return this.formatArabic(months, 'شهر', 'شهرين', 'أشهر');
        }

        const years = Math.floor(months / 12);
        return this.formatArabic(years, 'سنة', 'سنتين', 'سنوات');
    }

    private formatArabic(value: number, single: string, double: string, plural: string): string {
        if (value === 1) return `منذ ${single}`;
        if (value === 2) return `منذ ${double}`;
        if (value >= 3 && value <= 10) return `منذ ${value} ${plural}`;
        return `منذ ${value} ${single}`; // 11+ uses single form in Arabic (e.g. 11 دقيقة)
    }
}

import { IconComponent } from '../icon/icon.component';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [IconComponent, CommonModule],
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {
    @Input() label = 'Upload File';
    @Input() accept = '*';
    @Input() multiple = false;
    @Input() disabled = false;
    @Input() isLoading = false;
    @Input() error?: string;

    @Output() filesSelected = new EventEmitter<File[]>();

    selectedFiles: File[] = [];

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            if (this.multiple) {
                this.selectedFiles = [...this.selectedFiles, ...Array.from(input.files)];
            } else {
                this.selectedFiles = [input.files[0]];
            }
            this.emitFiles();
        }
        // Reset input so same file can be selected again if needed
        input.value = '';
    }

    removeFile(index: number, event: Event): void {
        event.stopPropagation();
        if (this.disabled || this.isLoading) return;
        this.selectedFiles.splice(index, 1);
        this.emitFiles();
    }

    private emitFiles(): void {
        this.filesSelected.emit(this.selectedFiles);
    }

    triggerClick(fileInput: HTMLInputElement): void {
        if (!this.disabled && !this.isLoading) {
            fileInput.click();
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

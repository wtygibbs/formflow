import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

export interface QueuedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  sizeFormatted: string;
}

@Component({
  selector: 'app-document-upload-zone',
  standalone: true,
  imports: [
    CommonModule,
    CdkDropList,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmSpinnerImports
  ],
  templateUrl: './document-upload-zone.component.html',
  styleUrls: ['./document-upload-zone.component.css']
})
export class DocumentUploadZoneComponent {
  // Signals
  isDraggingOver = signal(false);
  fileQueue = signal<QueuedFile[]>([]);
  uploading = signal(false);

  // Output events
  filesQueued = output<File[]>();
  uploadRequested = output<void>();

  // Drag counter to prevent flickering
  private dragCounter = 0;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.dragCounter === 0) {
      this.isDraggingOver.set(true);
    }
    this.dragCounter++;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDraggingOver.set(false);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingOver.set(false);
    this.dragCounter = 0;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addFilesToQueue(Array.from(files));
    }
  }

  onFilesDropped(event: CdkDragDrop<any>) {
    // This is for CDK drop list - we handle via onDrop instead
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFilesToQueue(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  addFilesToQueue(files: File[]) {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const validFiles: File[] = [];

    files.forEach(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(extension)) {
        return; // Skip invalid files
      }

      if (file.size > maxFileSize) {
        return; // Skip oversized files
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      const newQueuedFiles: QueuedFile[] = validFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        sizeFormatted: this.formatFileSize(file.size)
      }));

      this.fileQueue.set([...this.fileQueue(), ...newQueuedFiles]);
      this.filesQueued.emit(validFiles);
    }
  }

  removeFromQueue(id: string) {
    this.fileQueue.set(this.fileQueue().filter(f => f.id !== id));
  }

  clearQueue() {
    this.fileQueue.set([]);
  }

  uploadFiles() {
    if (this.fileQueue().length === 0) return;
    this.uploadRequested.emit();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  setUploading(uploading: boolean) {
    this.uploading.set(uploading);
  }
}

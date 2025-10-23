import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentService, DocumentListItem } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-4xl font-bold text-base-content">Documents</h1>
        <label class="btn btn-primary gap-2 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
          Upload Document
        </label>
      </div>

      <!-- Alerts -->
      @if (uploading()) {
        <div class="alert alert-info">
          <span class="loading loading-spinner"></span>
          <span>Uploading document...</span>
        </div>
      }

      @if (error()) {
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error() }}</span>
        </div>
      }

      <!-- Content -->
      @if (loading()) {
        <div class="flex justify-center p-16">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      } @else if (documents().length === 0) {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center py-16">
            <div class="text-8xl mb-6">📄</div>
            <h2 class="card-title text-3xl mb-4">No Documents Yet</h2>
            <p class="text-base-content/60 mb-6">Upload your first ACORD 125 form to get started</p>
            <label class="btn btn-primary btn-lg gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
              Upload Your First Document
            </label>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of documents(); track doc.id) {
            <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <div class="text-5xl">📄</div>
                  @switch (doc.status) {
                    @case (0) {
                      <div class="badge badge-neutral">Uploaded</div>
                    }
                    @case (1) {
                      <div class="badge badge-warning">Processing</div>
                    }
                    @case (2) {
                      <div class="badge badge-success">Completed</div>
                    }
                    @case (3) {
                      <div class="badge badge-error">Failed</div>
                    }
                  }
                </div>
                <h3 class="card-title text-lg truncate" title="{{ doc.fileName }}">{{ doc.fileName }}</h3>
                <div class="space-y-1 text-sm text-base-content/60">
                  <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                  @if (doc.processedAt) {
                    <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                  }
                  <p>Fields Extracted: {{ doc.extractedFieldsCount }}</p>
                </div>
                <div class="card-actions justify-end mt-4">
                  <a [routerLink]="['/documents', doc.id]" class="btn btn-primary btn-sm">
                    View Details
                  </a>
                  @if (doc.status === 2) {
                    <button (click)="downloadCsv(doc.id, doc.fileName)" class="btn btn-outline btn-sm gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      CSV
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: []
})
export class DocumentListComponent implements OnInit {
  private documentService = inject(DocumentService);

  documents = signal<DocumentListItem[]>([]);
  loading = signal(true);
  uploading = signal(false);
  error = signal('');

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load documents');
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadDocument(file);
    }
  }

  uploadDocument(file: File) {
    this.error.set('');
    this.uploading.set(true);

    this.documentService.uploadDocument(file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.loadDocuments();
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.error || 'Failed to upload document');
      }
    });
  }

  downloadCsv(documentId: string, fileName: string) {
    this.documentService.downloadCsv(documentId, fileName);
  }

  getStatusText(status: number): string {
    const statuses = ['Uploaded', 'Processing', 'Completed', 'Failed'];
    return statuses[status] || 'Unknown';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

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
        <h1 class="text-3xl font-bold">Documents</h1>
        <label class="btn btn-primary cursor-pointer">
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
          <span>{{ error() }}</span>
        </div>
      }

      <!-- Content -->
      @if (loading()) {
        <div class="flex justify-center p-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (documents().length === 0) {
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body items-center text-center py-16">
            <h2 class="text-2xl font-semibold mb-2">No Documents Yet</h2>
            <p class="text-base-content/70 mb-6">Upload your first ACORD 125 form to get started</p>
            <label class="btn btn-primary cursor-pointer">
              <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
              Upload Your First Document
            </label>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of documents(); track doc.id) {
            <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
              <div class="card-body">
                <div class="flex justify-between items-start mb-3">
                  <h3 class="text-base font-semibold truncate flex-1 mr-2" title="{{ doc.fileName }}">{{ doc.fileName }}</h3>
                  @switch (doc.status) {
                    @case (0) {
                      <div class="badge badge-neutral badge-sm">Uploaded</div>
                    }
                    @case (1) {
                      <div class="badge badge-warning badge-sm">Processing</div>
                    }
                    @case (2) {
                      <div class="badge badge-success badge-sm">Completed</div>
                    }
                    @case (3) {
                      <div class="badge badge-error badge-sm">Failed</div>
                    }
                  }
                </div>
                <div class="space-y-1 text-sm text-base-content/70">
                  <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                  @if (doc.processedAt) {
                    <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                  }
                  <p>Fields: {{ doc.extractedFieldsCount }}</p>
                </div>
                <div class="flex gap-2 mt-4">
                  <a [routerLink]="['/documents', doc.id]" class="btn btn-primary btn-sm flex-1">
                    View
                  </a>
                  @if (doc.status === 2) {
                    <button (click)="downloadCsv(doc.id, doc.fileName)" class="btn btn-outline btn-sm">
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

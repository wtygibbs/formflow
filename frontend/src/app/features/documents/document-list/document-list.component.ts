import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentService, DocumentListItem } from '../../../core/services/document.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold">Documents</h1>
        <label hlmBtn class="cursor-pointer">
          <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
          Upload Document
        </label>
      </div>

      <!-- Alerts -->
      @if (uploading()) {
        <div hlmAlert class="flex items-center gap-2">
          <hlm-spinner class="size-4" />
          <p hlmAlertDescription>Uploading document...</p>
        </div>
      }

      @if (error()) {
        <div hlmAlert variant="destructive">
          <p hlmAlertDescription>{{ error() }}</p>
        </div>
      }

      <!-- Content -->
      @if (loading()) {
        <div class="flex justify-center p-16">
          <hlm-spinner />
        </div>
      } @else if (documents().length === 0) {
        <div hlmCard>
          <div hlmCardContent class="flex flex-col items-center text-center py-16">
            <h2 class="text-2xl font-semibold mb-2">No Documents Yet</h2>
            <p class="text-muted-foreground mb-6">Upload your first ACORD 125 form to get started</p>
            <label hlmBtn class="cursor-pointer">
              <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
              Upload Your First Document
            </label>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of documents(); track doc.id) {
            <div hlmCard class="hover:shadow-md transition-shadow">
              <div hlmCardContent>
                <div class="flex justify-between items-start mb-3">
                  <h3 class="text-base font-semibold truncate flex-1 mr-2" title="{{ doc.fileName }}">{{ doc.fileName }}</h3>
                  @switch (doc.status) {
                    @case (0) {
                      <span hlmBadge variant="secondary">Uploaded</span>
                    }
                    @case (1) {
                      <span hlmBadge variant="outline" class="border-yellow-500 text-yellow-600">Processing</span>
                    }
                    @case (2) {
                      <span hlmBadge class="bg-green-600 text-white">Completed</span>
                    }
                    @case (3) {
                      <span hlmBadge variant="destructive">Failed</span>
                    }
                  }
                </div>
                <div class="space-y-1 text-sm text-muted-foreground">
                  <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                  @if (doc.processedAt) {
                    <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                  }
                  <p>Fields: {{ doc.extractedFieldsCount }}</p>
                </div>
                <div class="flex gap-2 mt-4">
                  <a hlmBtn size="sm" class="flex-1" [routerLink]="['/documents', doc.id]">
                    View
                  </a>
                  @if (doc.status === 2) {
                    <button hlmBtn variant="outline" size="sm" (click)="downloadCsv(doc.id, doc.fileName)">
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

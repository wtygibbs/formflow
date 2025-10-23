import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentService, DocumentListItem } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="documents-container">
      <div class="header">
        <h1>Documents</h1>
        <label class="btn btn-primary upload-btn">
          <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
          Upload Document
        </label>
      </div>

      @if (uploading()) {
        <div class="alert alert-info">Uploading document...</div>
      }

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <p>Loading documents...</p>
      } @else if (documents().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h2>No Documents Yet</h2>
          <p>Upload your first ACORD 125 form to get started</p>
          <label class="btn btn-primary">
            <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
            Upload Your First Document
          </label>
        </div>
      } @else {
        <div class="documents-grid">
          @for (doc of documents(); track doc.id) {
            <div class="document-card">
              <div class="document-header">
                <span class="file-icon">📄</span>
                <span [class]="'status-badge status-' + doc.status">{{ getStatusText(doc.status) }}</span>
              </div>
              <h3>{{ doc.fileName }}</h3>
              <div class="document-meta">
                <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                @if (doc.processedAt) {
                  <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                }
                <p>Fields Extracted: {{ doc.extractedFieldsCount }}</p>
              </div>
              <div class="document-actions">
                <a [routerLink]="['/documents', doc.id]" class="btn btn-sm btn-primary">
                  View Details
                </a>
                @if (doc.status === 2) {
                  <button (click)="downloadCsv(doc.id, doc.fileName)" class="btn btn-sm btn-outline">
                    Export CSV
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .documents-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      margin: 0;
      color: #333;
    }

    .upload-btn {
      cursor: pointer;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
      display: inline-block;
      cursor: pointer;
      font-size: 1rem;
      background: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-outline {
      background: white;
      color: #667eea;
      border-color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .alert {
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
    }

    .alert-info {
      background: #e7f3ff;
      color: #0066cc;
      border: 1px solid #b3d9ff;
    }

    .alert-error {
      background: #fee;
      color: #c33;
      border: 1px solid #fcc;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .empty-state p {
      color: #6c757d;
      margin: 0 0 2rem 0;
    }

    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .document-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }

    .document-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .file-icon {
      font-size: 2rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-0 { background: #e0e0e0; color: #666; }
    .status-1 { background: #fff3cd; color: #856404; }
    .status-2 { background: #d4edda; color: #155724; }
    .status-3 { background: #f8d7da; color: #721c24; }

    .document-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .document-meta {
      margin-bottom: 1.5rem;
    }

    .document-meta p {
      margin: 0.25rem 0;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .document-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `]
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

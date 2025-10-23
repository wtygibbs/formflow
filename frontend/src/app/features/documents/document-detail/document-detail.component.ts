import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocumentService, DocumentDetail, ExtractedField } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="document-detail">
      @if (loading()) {
        <p>Loading document...</p>
      } @else if (document(); as doc) {
        <div class="header">
          <div>
            <a routerLink="/documents" class="back-link">← Back to Documents</a>
            <h1>{{ doc.fileName }}</h1>
            <div class="document-meta">
              <span class="meta-item">
                Status: <span [class]="'status-' + doc.status">{{ getStatusText(doc.status) }}</span>
              </span>
              <span class="meta-item">Uploaded: {{ formatDate(doc.uploadedAt) }}</span>
              @if (doc.processedAt) {
                <span class="meta-item">Processed: {{ formatDate(doc.processedAt) }}</span>
              }
            </div>
          </div>
          <button (click)="exportCsv()" class="btn btn-primary" [disabled]="doc.status !== 2">
            Export CSV
          </button>
        </div>

        @if (doc.processingError) {
          <div class="alert alert-error">
            <strong>Processing Error:</strong> {{ doc.processingError }}
          </div>
        }

        @if (doc.status === 1) {
          <div class="alert alert-info">
            Document is currently being processed. This may take a few minutes...
          </div>
        }

        @if (doc.extractedFields.length === 0) {
          <div class="empty-state">
            <p>No fields extracted yet.</p>
          </div>
        } @else {
          <div class="fields-container">
            <div class="fields-header">
              <h2>Extracted Fields ({{ doc.extractedFields.length }})</h2>
              <div class="legend">
                <span class="legend-item">
                  <span class="confidence-indicator high"></span> High Confidence (>80%)
                </span>
                <span class="legend-item">
                  <span class="confidence-indicator medium"></span> Medium Confidence (60-80%)
                </span>
                <span class="legend-item">
                  <span class="confidence-indicator low"></span> Low Confidence (<60%)
                </span>
              </div>
            </div>

            <div class="fields-list">
              @for (field of doc.extractedFields; track field.id) {
                <div class="field-item" [class.verified]="field.isVerified">
                  <div class="field-header">
                    <h3>{{ field.fieldName }}</h3>
                    <div class="field-actions">
                      <span class="confidence-badge" [class]="getConfidenceClass(field.confidence)">
                        {{ (field.confidence * 100).toFixed(0) }}% confidence
                      </span>
                      @if (field.isVerified) {
                        <span class="verified-badge">✓ Verified</span>
                      }
                    </div>
                  </div>
                  <div class="field-content">
                    @if (editingField() === field.id) {
                      <div class="edit-mode">
                        <input
                          type="text"
                          [(ngModel)]="editValue"
                          class="form-control"
                          placeholder="Enter corrected value"
                        />
                        <div class="edit-actions">
                          <button (click)="saveField(field)" class="btn btn-sm btn-primary">Save</button>
                          <button (click)="cancelEdit()" class="btn btn-sm btn-outline">Cancel</button>
                        </div>
                      </div>
                    } @else {
                      <div class="view-mode">
                        <p class="field-value">
                          {{ field.editedValue || field.fieldValue }}
                          @if (field.editedValue) {
                            <span class="edited-badge">(Edited)</span>
                          }
                        </p>
                        <div class="field-actions-buttons">
                          <button (click)="startEdit(field)" class="btn btn-sm btn-outline">Edit</button>
                          @if (!field.isVerified) {
                            <button (click)="verifyField(field)" class="btn btn-sm btn-primary">Mark as Verified</button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .document-detail {
      max-width: 1200px;
      margin: 0 auto;
    }

    .back-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
      margin-bottom: 1rem;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    h1 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .document-meta {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .meta-item {
      color: #6c757d;
      font-size: 0.875rem;
    }

    .status-0 { color: #6c757d; }
    .status-1 { color: #ffc107; }
    .status-2 { color: #28a745; }
    .status-3 { color: #dc3545; }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
      cursor: pointer;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .fields-container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .fields-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .fields-header h2 {
      margin: 0;
      color: #333;
    }

    .legend {
      display: flex;
      gap: 1.5rem;
      font-size: 0.875rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .confidence-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .confidence-indicator.high { background: #28a745; }
    .confidence-indicator.medium { background: #ffc107; }
    .confidence-indicator.low { background: #dc3545; }

    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .field-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 1.5rem;
      transition: all 0.3s;
    }

    .field-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }

    .field-item.verified {
      background: #f0f8f4;
      border-color: #28a745;
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .field-header h3 {
      margin: 0;
      color: #333;
      font-size: 1rem;
    }

    .field-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .confidence-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .confidence-badge.high {
      background: #d4edda;
      color: #155724;
    }

    .confidence-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .confidence-badge.low {
      background: #f8d7da;
      color: #721c24;
    }

    .verified-badge {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .edited-badge {
      color: #667eea;
      font-size: 0.875rem;
      font-style: italic;
    }

    .field-content {
      margin-top: 1rem;
    }

    .field-value {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
      margin-bottom: 1rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .view-mode {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .field-actions-buttons {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
    }
  `]
})
export class DocumentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);

  document = signal<DocumentDetail | null>(null);
  loading = signal(true);
  editingField = signal<string | null>(null);
  editValue = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDocument(id);
    }
  }

  loadDocument(id: string) {
    this.documentService.getDocument(id).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/documents']);
      }
    });
  }

  startEdit(field: ExtractedField) {
    this.editingField.set(field.id);
    this.editValue = field.editedValue || field.fieldValue;
  }

  cancelEdit() {
    this.editingField.set(null);
    this.editValue = '';
  }

  saveField(field: ExtractedField) {
    this.documentService.updateField(field.id, this.editValue, false).subscribe({
      next: () => {
        field.editedValue = this.editValue;
        this.editingField.set(null);
        this.editValue = '';
      }
    });
  }

  verifyField(field: ExtractedField) {
    const value = field.editedValue || field.fieldValue;
    this.documentService.updateField(field.id, value, true).subscribe({
      next: () => {
        field.isVerified = true;
      }
    });
  }

  exportCsv() {
    const doc = this.document();
    if (doc) {
      this.documentService.downloadCsv(doc.id, doc.fileName);
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }

  getStatusText(status: number): string {
    const statuses = ['Uploaded', 'Processing', 'Completed', 'Failed'];
    return statuses[status] || 'Unknown';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

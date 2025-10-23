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
    <div class="space-y-6">
      @if (loading()) {
        <div class="flex justify-center p-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      } @else if (document(); as doc) {
        <!-- Header -->
        <div>
          <a routerLink="/documents" class="link link-primary text-sm">
            ← Back to Documents
          </a>
        </div>

        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body">
            <div class="flex justify-between items-start gap-4 flex-wrap">
              <div class="flex-1">
                <h1 class="text-2xl font-semibold mb-3">{{ doc.fileName }}</h1>
                <div class="flex flex-wrap gap-4 text-sm text-base-content/70">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Status:</span>
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
                  <span>Uploaded: {{ formatDate(doc.uploadedAt) }}</span>
                  @if (doc.processedAt) {
                    <span>Processed: {{ formatDate(doc.processedAt) }}</span>
                  }
                </div>
              </div>
              <button (click)="exportCsv()" class="btn btn-primary btn-sm" [disabled]="doc.status !== 2">
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        @if (doc.processingError) {
          <div class="alert alert-error">
            <div>
              <strong>Processing Error:</strong> {{ doc.processingError }}
            </div>
          </div>
        }

        @if (doc.status === 1) {
          <div class="alert alert-info">
            <span class="loading loading-spinner"></span>
            <span>Document is currently being processed. This may take a few minutes...</span>
          </div>
        }

        <!-- Extracted Fields -->
        @if (doc.extractedFields.length === 0) {
          <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body items-center text-center py-12">
              <p class="text-base-content/70">No fields extracted yet.</p>
            </div>
          </div>
        } @else {
          <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body">
              <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 class="text-xl font-semibold">Extracted Fields ({{ doc.extractedFields.length }})</h2>
                <div class="flex flex-wrap gap-3 text-xs text-base-content/70">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-success"></div>
                    <span>High (>80%)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-warning"></div>
                    <span>Medium (60-80%)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-error"></div>
                    <span>Low (<60%)</span>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                @for (field of doc.extractedFields; track field.id) {
                  <div class="border border-base-300 rounded-lg p-4 hover:border-primary/50 transition-colors"
                       [class.bg-success/5]="field.isVerified"
                       [class.border-success/50]="field.isVerified">
                    <div class="flex justify-between items-start mb-2 gap-4">
                      <h3 class="font-medium">{{ field.fieldName }}</h3>
                      <div class="flex gap-1.5 items-center flex-wrap justify-end">
                        @switch (getConfidenceClass(field.confidence)) {
                          @case ('high') {
                            <div class="badge badge-success badge-sm">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                          @case ('medium') {
                            <div class="badge badge-warning badge-sm">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                          @case ('low') {
                            <div class="badge badge-error badge-sm">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                        }
                        @if (field.isVerified) {
                          <div class="badge badge-success badge-sm">
                            Verified
                          </div>
                        }
                      </div>
                    </div>

                    @if (editingField() === field.id) {
                      <div class="space-y-2">
                        <input
                          type="text"
                          [(ngModel)]="editValue"
                          class="input input-bordered input-sm w-full"
                          placeholder="Enter corrected value"
                        />
                        <div class="flex gap-2">
                          <button (click)="saveField(field)" class="btn btn-primary btn-xs">Save</button>
                          <button (click)="cancelEdit()" class="btn btn-outline btn-xs">Cancel</button>
                        </div>
                      </div>
                    } @else {
                      <div class="flex justify-between items-center gap-4">
                        <div class="flex-1">
                          <div class="bg-base-200 rounded px-3 py-2">
                            <span class="font-mono text-sm">{{ field.editedValue || field.fieldValue }}</span>
                            @if (field.editedValue) {
                              <span class="badge badge-info badge-xs ml-2">Edited</span>
                            }
                          </div>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                          <button (click)="startEdit(field)" class="btn btn-outline btn-xs">Edit</button>
                          @if (!field.isVerified) {
                            <button (click)="verifyField(field)" class="btn btn-primary btn-xs">Verify</button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: []
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

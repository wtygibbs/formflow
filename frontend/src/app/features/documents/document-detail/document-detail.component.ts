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
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      } @else if (document(); as doc) {
        <!-- Header -->
        <div>
          <a routerLink="/documents" class="link link-primary font-semibold mb-4 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Back to Documents
          </a>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex justify-between items-start gap-4">
              <div class="flex-1">
                <h1 class="text-3xl font-bold text-base-content mb-4">{{ doc.fileName }}</h1>
                <div class="flex flex-wrap gap-4 text-sm">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">Status:</span>
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
                  <span class="text-base-content/60">Uploaded: {{ formatDate(doc.uploadedAt) }}</span>
                  @if (doc.processedAt) {
                    <span class="text-base-content/60">Processed: {{ formatDate(doc.processedAt) }}</span>
                  }
                </div>
              </div>
              <button (click)="exportCsv()" class="btn btn-primary gap-2" [disabled]="doc.status !== 2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        @if (doc.processingError) {
          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center py-12">
              <div class="text-6xl mb-4">📄</div>
              <p class="text-base-content/60">No fields extracted yet.</p>
            </div>
          </div>
        } @else {
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 class="card-title text-2xl">Extracted Fields ({{ doc.extractedFields.length }})</h2>
                <div class="flex flex-wrap gap-4 text-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-success"></div>
                    <span>High (>80%)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-warning"></div>
                    <span>Medium (60-80%)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-error"></div>
                    <span>Low (<60%)</span>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                @for (field of doc.extractedFields; track field.id) {
                  <div class="border rounded-lg p-4 hover:border-primary transition-colors"
                       [class.bg-success/5]="field.isVerified"
                       [class.border-success]="field.isVerified">
                    <div class="flex justify-between items-start mb-3 gap-4">
                      <h3 class="font-semibold text-lg">{{ field.fieldName }}</h3>
                      <div class="flex gap-2 items-center flex-wrap justify-end">
                        @switch (getConfidenceClass(field.confidence)) {
                          @case ('high') {
                            <div class="badge badge-success">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                          @case ('medium') {
                            <div class="badge badge-warning">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                          @case ('low') {
                            <div class="badge badge-error">{{ (field.confidence * 100).toFixed(0) }}%</div>
                          }
                        }
                        @if (field.isVerified) {
                          <div class="badge badge-success gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                            Verified
                          </div>
                        }
                      </div>
                    </div>

                    @if (editingField() === field.id) {
                      <div class="space-y-3">
                        <input
                          type="text"
                          [(ngModel)]="editValue"
                          class="input input-bordered w-full"
                          placeholder="Enter corrected value"
                        />
                        <div class="flex gap-2">
                          <button (click)="saveField(field)" class="btn btn-primary btn-sm">Save</button>
                          <button (click)="cancelEdit()" class="btn btn-outline btn-sm">Cancel</button>
                        </div>
                      </div>
                    } @else {
                      <div class="flex justify-between items-center gap-4">
                        <div class="flex-1">
                          <div class="bg-base-200 rounded p-3">
                            <span class="font-mono">{{ field.editedValue || field.fieldValue }}</span>
                            @if (field.editedValue) {
                              <span class="badge badge-info badge-sm ml-2">Edited</span>
                            }
                          </div>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                          <button (click)="startEdit(field)" class="btn btn-outline btn-sm">Edit</button>
                          @if (!field.isVerified) {
                            <button (click)="verifyField(field)" class="btn btn-primary btn-sm">Verify</button>
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

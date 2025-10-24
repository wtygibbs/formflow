import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocumentService, DocumentDetail, ExtractedField } from '../../../core/services/document.service';
import { ToastService } from '../../../core/services/toast.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports,
    ...HlmInputImports,
    ...HlmSkeletonImports
  ],
  template: `
    <div class="space-y-6">
      @if (loading()) {
        <!-- Skeleton Loading State -->
        <div>
          <hlm-skeleton class="h-4 w-32 mb-4" />
        </div>
        <div hlmCard>
          <div hlmCardContent class="space-y-4">
            <div class="flex justify-between items-start">
              <div class="flex-1 space-y-3">
                <hlm-skeleton class="h-8 w-3/4" />
                <div class="flex gap-4">
                  <hlm-skeleton class="h-5 w-24" />
                  <hlm-skeleton class="h-5 w-32" />
                  <hlm-skeleton class="h-5 w-28" />
                </div>
              </div>
              <hlm-skeleton class="h-9 w-28" />
            </div>
          </div>
        </div>
        <div hlmCard>
          <div hlmCardContent class="space-y-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="space-y-2 border-b pb-4">
                <hlm-skeleton class="h-5 w-48" />
                <hlm-skeleton class="h-6 w-full" />
                <div class="flex gap-2">
                  <hlm-skeleton class="h-4 w-20" />
                  <hlm-skeleton class="h-4 w-16" />
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (document(); as doc) {
        <!-- Header -->
        <div>
          <a routerLink="/documents" class="text-sm text-primary hover:underline">
            ← Back to Documents
          </a>
        </div>

        <div hlmCard>
          <div hlmCardContent>
            <div class="flex justify-between items-start gap-4 flex-wrap">
              <div class="flex-1">
                <h1 class="text-2xl font-semibold mb-3">{{ doc.fileName }}</h1>
                <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Status:</span>
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
                  <span>Uploaded: {{ formatDate(doc.uploadedAt) }}</span>
                  @if (doc.processedAt) {
                    <span>Processed: {{ formatDate(doc.processedAt) }}</span>
                  }
                </div>
              </div>
              <button hlmBtn size="sm" (click)="exportCsv()" [disabled]="doc.status !== 2">
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        @if (doc.processingError) {
          <div hlmAlert variant="destructive">
            <p hlmAlertDescription>
              <strong>Processing Error:</strong> {{ doc.processingError }}
            </p>
          </div>
        }

        @if (doc.status === 1) {
          <div hlmAlert class="flex items-center gap-2">
            <hlm-spinner class="size-4" />
            <p hlmAlertDescription>Document is currently being processed. This may take a few minutes...</p>
          </div>
        }

        <!-- Extracted Fields -->
        @if (doc.extractedFields.length === 0) {
          <div hlmCard>
            <div hlmCardContent class="flex flex-col items-center text-center py-12">
              <p class="text-muted-foreground">No fields extracted yet.</p>
            </div>
          </div>
        } @else {
          <div hlmCard>
            <div hlmCardContent>
              <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 class="text-xl font-semibold">Extracted Fields ({{ doc.extractedFields.length }})</h2>
                <div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-green-600"></div>
                    <span>High (>80%)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span>Medium (60-80%)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-red-600"></div>
                    <span>Low (<60%)</span>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                @for (field of doc.extractedFields; track field.id) {
                  <div class="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                       [class.bg-green-600/5]="field.isVerified"
                       [class.border-green-600/50]="field.isVerified">
                    <div class="flex justify-between items-start mb-2 gap-4">
                      <h3 class="font-medium">{{ field.fieldName }}</h3>
                      <div class="flex gap-1.5 items-center flex-wrap justify-end">
                        @switch (getConfidenceClass(field.confidence)) {
                          @case ('high') {
                            <span hlmBadge class="bg-green-600 text-white">{{ (field.confidence * 100).toFixed(0) }}%</span>
                          }
                          @case ('medium') {
                            <span hlmBadge variant="outline" class="border-yellow-500 text-yellow-600">{{ (field.confidence * 100).toFixed(0) }}%</span>
                          }
                          @case ('low') {
                            <span hlmBadge variant="destructive">{{ (field.confidence * 100).toFixed(0) }}%</span>
                          }
                        }
                        @if (field.isVerified) {
                          <span hlmBadge class="bg-green-600 text-white">
                            Verified
                          </span>
                        }
                      </div>
                    </div>

                    @if (editingField() === field.id) {
                      <div class="space-y-2">
                        <input
                          hlmInput
                          type="text"
                          [(ngModel)]="editValue"
                          class="w-full"
                          placeholder="Enter corrected value"
                        />
                        <div class="flex gap-2">
                          <button hlmBtn size="sm" (click)="saveField(field)">Save</button>
                          <button hlmBtn variant="outline" size="sm" (click)="cancelEdit()">Cancel</button>
                        </div>
                      </div>
                    } @else {
                      <div class="flex justify-between items-center gap-4">
                        <div class="flex-1">
                          <div class="bg-muted rounded px-3 py-2">
                            <span class="font-mono text-sm">{{ field.editedValue || field.fieldValue }}</span>
                            @if (field.editedValue) {
                              <span hlmBadge variant="secondary" class="ml-2 text-xs">Edited</span>
                            }
                          </div>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                          <button hlmBtn variant="outline" size="sm" (click)="startEdit(field)">Edit</button>
                          @if (!field.isVerified) {
                            <button hlmBtn size="sm" (click)="verifyField(field)">Verify</button>
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
  private toastService = inject(ToastService);

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
        this.toastService.error('Document not found', 'The requested document could not be loaded');
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
    const updatePromise = this.documentService.updateField(field.id, this.editValue, false).toPromise();

    this.toastService.promise(updatePromise!, {
      loading: 'Saving field...',
      success: 'Field updated successfully',
      error: 'Failed to update field'
    });

    updatePromise!.then(() => {
      field.editedValue = this.editValue;
      this.editingField.set(null);
      this.editValue = '';
    }).catch(() => {
      // Error already shown via toast
    });
  }

  verifyField(field: ExtractedField) {
    const value = field.editedValue || field.fieldValue;
    const verifyPromise = this.documentService.updateField(field.id, value, true).toPromise();

    this.toastService.promise(verifyPromise!, {
      loading: 'Verifying field...',
      success: 'Field verified successfully',
      error: 'Failed to verify field'
    });

    verifyPromise!.then(() => {
      field.isVerified = true;
    }).catch(() => {
      // Error already shown via toast
    });
  }

  exportCsv() {
    const doc = this.document();
    if (doc) {
      this.toastService.success('Downloading CSV...', 'Your export will start shortly');
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

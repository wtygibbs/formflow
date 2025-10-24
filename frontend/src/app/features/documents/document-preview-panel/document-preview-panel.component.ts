import { Component, computed, effect, inject, input, output, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { DocumentService, DocumentDetail, ExtractedField } from '../../../core/services/document.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-document-preview-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports,
    ...HlmSpinnerImports,
    ...HlmSkeletonImports
  ],
  templateUrl: './document-preview-panel.component.html',
  styleUrls: ['./document-preview-panel.component.css']
})
export class DocumentPreviewPanelComponent implements OnDestroy {
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);

  // Inputs
  documentId = input.required<string>();
  isOpen = input<boolean>(false);

  // Outputs
  closed = output<void>();

  // State
  document = signal<DocumentDetail | null>(null);
  loading = signal(false);
  editingField = signal<string | null>(null);
  editValue = signal('');
  filePreviewUrl = signal<string | null>(null);

  // Computed
  topFields = computed(() => {
    const doc = this.document();
    if (!doc) return [];
    return doc.extractedFields.slice(0, 5); // Show top 5 fields
  });

  constructor() {
    // Effect to load document when ID changes
    effect(() => {
      const id = this.documentId();
      if (id && this.isOpen()) {
        this.loadDocument(id);
      }
    }, { allowSignalWrites: true });
  }

  private loadDocument(id: string) {
    this.loading.set(true);

    // Clean up previous blob URL if exists
    const previousUrl = this.filePreviewUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
      this.filePreviewUrl.set(null);
    }

    this.documentService.getDocument(id).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.loading.set(false);

        // Fetch document file preview with auth token
        this.loadFilePreview(id);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Failed to load document', err.error?.error || err.message);
      }
    });
  }

  private loadFilePreview(id: string) {
    const url = `${environment.apiUrl}/documents/${id}/file`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        this.filePreviewUrl.set(blobUrl);
      },
      error: (err) => {
        console.error('Failed to load document preview', err);
        // Don't show error toast, just fail silently for preview
      }
    });
  }

  close() {
    this.closed.emit();
  }

  ngOnDestroy() {
    // Clean up blob URL when component is destroyed
    const url = this.filePreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  startEdit(field: ExtractedField) {
    this.editingField.set(field.id);
    this.editValue.set(field.editedValue || field.fieldValue);
  }

  cancelEdit() {
    this.editingField.set(null);
    this.editValue.set('');
  }

  saveField(field: ExtractedField) {
    const value = this.editValue();
    const updatePromise = this.documentService.updateField(field.id, value, false).toPromise();

    this.toastService.promise(updatePromise!, {
      loading: 'Saving...',
      success: 'Field updated',
      error: 'Save failed'
    });

    updatePromise!.then(() => {
      field.editedValue = value;
      this.editingField.set(null);
      this.editValue.set('');
    }).catch(() => {
      // Error already shown via toast
    });
  }

  verifyField(field: ExtractedField) {
    const value = field.editedValue || field.fieldValue;
    const verifyPromise = this.documentService.updateField(field.id, value, true).toPromise();

    this.toastService.promise(verifyPromise!, {
      loading: 'Verifying...',
      success: 'Field verified',
      error: 'Verification failed'
    });

    verifyPromise!.then(() => {
      field.isVerified = true;
    }).catch(() => {
      // Error already shown via toast
    });
  }

  copyToClipboard(value: string, fieldName: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.toastService.success('Copied!', `${fieldName} copied`);
    }).catch(() => {
      this.toastService.error('Copy failed', 'Could not copy to clipboard');
    });
  }

  exportCsv() {
    const doc = this.document();
    if (doc) {
      this.toastService.success('Downloading CSV...', 'Export starting');
      this.documentService.downloadCsv(doc.id, doc.fileName);
    }
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

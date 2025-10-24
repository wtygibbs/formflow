import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { DocumentService, DocumentDetail, ExtractedField } from '../../../core/services/document.service';
import { ToastService } from '../../../core/services/toast.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { ExtractedFieldItemComponent } from '../extracted-field-item/extracted-field-item.component';
import { DocumentProcessingStatusComponent } from '../document-processing-status/document-processing-status.component';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ExtractedFieldItemComponent,
    DocumentProcessingStatusComponent,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSkeletonImports
  ],
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.css']
})
export class DocumentDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private signalRService = inject(SignalRService);

  // Convert route params to signal
  private documentId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id')))
  );

  // Loading state
  loading = signal(true);

  // Document signal - load based on ID changes
  document = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        if (!id) {
          this.router.navigate(['/documents']);
          throw new Error('No document ID');
        }
        this.loading.set(true);
        return this.documentService.getDocument(id);
      }),
      map(doc => {
        this.loading.set(false);
        return doc;
      })
    ),
    { initialValue: null }
  );

  // SignalR signals
  private processingProgressRaw = toSignal(
    this.signalRService.processingProgress$,
    { initialValue: null }
  );

  private processingCompleteRaw = toSignal(
    this.signalRService.processingComplete$,
    { initialValue: null }
  );

  // Computed processing progress for current document
  processingProgress = computed(() => {
    const progress = this.processingProgressRaw();
    const docId = this.documentId();
    if (progress && progress.documentId === docId) {
      return progress;
    }
    return null;
  });

  // Edit state
  editingField = signal<string | null>(null);

  // Constructor with effects
  constructor() {
    // Effect to handle processing complete
    effect(() => {
      const complete = this.processingCompleteRaw();
      const docId = this.documentId();

      if (complete && complete.documentId === docId) {
        // Show toast notification
        if (complete.success) {
          this.toastService.success('Document processed successfully!', 'All fields have been extracted');
        } else {
          this.toastService.error('Document processing failed', 'Please check the error details');
        }

        // Reload document
        if (docId) {
          this.reloadDocument(docId);
        }
      }
    }, { allowSignalWrites: true });
  }

  private reloadDocument(id: string) {
    this.loading.set(true);
    this.documentService.getDocument(id).subscribe({
      next: (doc) => {
        // Signal is updated through the route observable
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Failed to reload document', 'Please refresh the page');
      }
    });
  }

  onEditRequested(field: ExtractedField) {
    this.editingField.set(field.id);
  }

  onCancelEdit() {
    this.editingField.set(null);
  }

  onSaveField(data: { field: ExtractedField; value: string }) {
    const updatePromise = this.documentService.updateField(data.field.id, data.value, false).toPromise();

    this.toastService.promise(updatePromise!, {
      loading: 'Saving field...',
      success: 'Field updated successfully',
      error: 'Failed to update field'
    });

    updatePromise!.then(() => {
      data.field.editedValue = data.value;
      this.editingField.set(null);
    }).catch(() => {
      // Error already shown via toast
    });
  }

  onVerifyField(field: ExtractedField) {
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

  onCopyToClipboard(data: { value: string; fieldName: string }) {
    navigator.clipboard.writeText(data.value).then(() => {
      this.toastService.success('Copied!', `${data.fieldName} copied to clipboard`);
    }).catch(() => {
      this.toastService.error('Copy failed', 'Could not copy to clipboard');
    });
  }

  exportCsv() {
    const doc = this.document();
    if (doc) {
      this.toastService.success('Downloading CSV...', 'Your export will start shortly');
      this.documentService.downloadCsv(doc.id, doc.fileName);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

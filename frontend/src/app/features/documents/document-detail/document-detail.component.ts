import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideChevronDown, lucideChevronUp, lucideDownload, lucideFilter, lucideSearch, lucideUndo2 } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { map, switchMap } from 'rxjs';
import { DocumentService, ExtractedField } from '../../../core/services/document.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { ToastService } from '../../../core/services/toast.service';
import { DocumentProcessingStatusComponent } from '../document-processing-status/document-processing-status.component';
import { ExtractedFieldItemComponent } from '../extracted-field-item/extracted-field-item.component';
import { DocumentHighlightOverlayComponent } from '../document-highlight-overlay/document-highlight-overlay.component';

interface FieldGroup {
  category: string;
  fields: ExtractedField[];
  collapsed: boolean;
}

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ExtractedFieldItemComponent,
    DocumentProcessingStatusComponent,
    DocumentHighlightOverlayComponent,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSkeletonImports,
    ...HlmInputImports,
    ...HlmCheckboxImports,
    ...HlmSelectImports,
    ...HlmIconImports
  ],
  providers: [provideIcons({ lucideSearch, lucideFilter, lucideChevronDown, lucideChevronUp, lucideDownload, lucideUndo2, lucideCheckCircle2 })],
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.css']
})
export class DocumentDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private signalRService = inject(SignalRService);
  private sanitizer = inject(DomSanitizer);

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

  // View mode: 'split' or 'fields-only'
  viewMode = signal<'split' | 'fields-only'>('split');

  // Split panel width (percentage)
  splitPosition = signal(50);
  isResizing = signal(false);

  // Search and filter
  searchQuery = signal('');
  confidenceFilter = signal<'all' | 'high' | 'medium' | 'low'>('all');
  verificationFilter = signal<'all' | 'verified' | 'unverified'>('all');
  editedFilter = signal<'all' | 'edited' | 'original'>('all');
  sortBy = signal<'name' | 'confidence' | 'verification'>('name');
  sortOrder = signal<'asc' | 'desc'>('asc');

  // Bulk selection
  selectedFields = signal<Set<string>>(new Set());
  selectAllChecked = signal(false);

  // Field grouping
  groupByCategory = signal(true);
  collapsedGroups = signal<Set<string>>(new Set());

  // Field highlighting
  activeFieldForHighlight = signal<ExtractedField | null>(null);
  private highlightTimeout: any;

  fileType = computed(() => {
    const doc = this.document();
    if (!doc) return null;

    const extension = doc.fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'tiff', 'tif'].includes(extension || '')) return 'image';
    return null;
  });

  filePreviewUrl = computed(() => {
    const doc = this.document();
    // FileUrl now contains a SAS URL from the backend
    return doc?.fileUrl || null;
  });

  // Sanitized file URL for iframe
  safeFileUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.filePreviewUrl();
    if (!url) return null;
    // Sanitize the URL for use in iframe (needed for PDFs)
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // Filtered and sorted fields
  filteredFields = computed(() => {
    const doc = this.document();
    if (!doc) return [];

    let fields = [...doc.extractedFields];

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      fields = fields.filter(f =>
        f.fieldName.toLowerCase().includes(query) ||
        f.fieldValue.toLowerCase().includes(query) ||
        (f.editedValue && f.editedValue.toLowerCase().includes(query))
      );
    }

    // Apply confidence filter
    const confFilter = this.confidenceFilter();
    if (confFilter !== 'all') {
      if (confFilter === 'high') {
        fields = fields.filter(f => f.confidence > 0.8);
      } else if (confFilter === 'medium') {
        fields = fields.filter(f => f.confidence > 0.6 && f.confidence <= 0.8);
      } else if (confFilter === 'low') {
        fields = fields.filter(f => f.confidence <= 0.6);
      }
    }

    // Apply verification filter
    const verifyFilter = this.verificationFilter();
    if (verifyFilter === 'verified') {
      fields = fields.filter(f => f.isVerified);
    } else if (verifyFilter === 'unverified') {
      fields = fields.filter(f => !f.isVerified);
    }

    // Apply edited filter
    const editFilter = this.editedFilter();
    if (editFilter === 'edited') {
      fields = fields.filter(f => f.editedValue);
    } else if (editFilter === 'original') {
      fields = fields.filter(f => !f.editedValue);
    }

    // Apply sorting
    const sort = this.sortBy();
    const order = this.sortOrder();
    fields.sort((a, b) => {
      let comparison = 0;
      if (sort === 'name') {
        comparison = a.fieldName.localeCompare(b.fieldName);
      } else if (sort === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sort === 'verification') {
        comparison = (a.isVerified ? 1 : 0) - (b.isVerified ? 1 : 0);
      }
      return order === 'asc' ? comparison : -comparison;
    });

    return fields;
  });

  // Grouped fields by category
  groupedFields = computed(() => {
    const fields = this.filteredFields();
    if (!this.groupByCategory()) {
      return [{ category: 'All Fields', fields, collapsed: false }];
    }

    // Group fields by category (based on field name prefix)
    const groups = new Map<string, ExtractedField[]>();

    fields.forEach(field => {
      const category = this.categorizeField(field.fieldName);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(field);
    });

    const collapsedSet = this.collapsedGroups();
    return Array.from(groups.entries()).map(([category, fields]) => ({
      category,
      fields,
      collapsed: collapsedSet.has(category)
    }));
  });

  // Confidence insights
  confidenceInsights = computed(() => {
    const doc = this.document();
    if (!doc || doc.extractedFields.length === 0) {
      return { high: 0, medium: 0, low: 0, average: 0 };
    }

    const fields = doc.extractedFields;
    const high = fields.filter(f => f.confidence > 0.8).length;
    const medium = fields.filter(f => f.confidence > 0.6 && f.confidence <= 0.8).length;
    const low = fields.filter(f => f.confidence <= 0.6).length;
    const average = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;

    return { high, medium, low, average: Math.round(average * 100) };
  });

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
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Failed to reload document', 'Please refresh the page');
      }
    });
  }

  private categorizeField(fieldName: string): string {
    const name = fieldName.toLowerCase();

    if (name.includes('applicant') || name.includes('insured') || name.includes('name') || name.includes('contact')) {
      return 'Applicant Information';
    } else if (name.includes('address') || name.includes('city') || name.includes('state') || name.includes('zip') || name.includes('location')) {
      return 'Address & Location';
    } else if (name.includes('coverage') || name.includes('limit') || name.includes('premium') || name.includes('deductible')) {
      return 'Coverage Details';
    } else if (name.includes('policy') || name.includes('effective') || name.includes('expiration') || name.includes('date')) {
      return 'Policy Information';
    } else if (name.includes('agent') || name.includes('broker') || name.includes('producer')) {
      return 'Agent/Broker Information';
    } else {
      return 'Other Fields';
    }
  }

  // View controls
  toggleViewMode() {
    this.viewMode.update(mode => mode === 'split' ? 'fields-only' : 'split');
  }

  // Resizing
  onMouseDown(event: MouseEvent) {
    this.isResizing.set(true);
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isResizing()) return;

    const container = document.querySelector('.split-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const percentage = ((event.clientX - rect.left) / rect.width) * 100;
      this.splitPosition.set(Math.max(30, Math.min(70, percentage)));
    }
  }

  onMouseUp() {
    this.isResizing.set(false);
  }

  // Search and filter
  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  onConfidenceFilterChange(filter: 'all' | 'high' | 'medium' | 'low') {
    this.confidenceFilter.set(filter);
  }

  onVerificationFilterChange(filter: 'all' | 'verified' | 'unverified') {
    this.verificationFilter.set(filter);
  }

  onEditedFilterChange(filter: 'all' | 'edited' | 'original') {
    this.editedFilter.set(filter);
  }

  toggleSort(by: 'name' | 'confidence' | 'verification') {
    if (this.sortBy() === by) {
      this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(by);
      this.sortOrder.set('asc');
    }
  }

  clearFilters() {
    this.searchQuery.set('');
    this.confidenceFilter.set('all');
    this.verificationFilter.set('all');
    this.editedFilter.set('all');
    this.sortBy.set('name');
    this.sortOrder.set('asc');
  }

  // Bulk selection
  toggleSelectAll() {
    const fields = this.filteredFields();
    if (this.selectAllChecked()) {
      this.selectedFields.set(new Set());
      this.selectAllChecked.set(false);
    } else {
      this.selectedFields.set(new Set(fields.map(f => f.id)));
      this.selectAllChecked.set(true);
    }
  }

  toggleFieldSelection(fieldId: string) {
    this.selectedFields.update(selected => {
      const newSet = new Set(selected);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });

    // Update select all checkbox state
    const totalFields = this.filteredFields().length;
    const selectedCount = this.selectedFields().size;
    this.selectAllChecked.set(totalFields > 0 && selectedCount === totalFields);
  }

  isFieldSelected(fieldId: string): boolean {
    return this.selectedFields().has(fieldId);
  }

  // Bulk actions
  bulkVerifySelected() {
    const selected = Array.from(this.selectedFields());
    if (selected.length === 0) {
      this.toastService.warning('No fields selected', 'Please select fields to verify');
      return;
    }

    const doc = this.document();
    if (!doc) return;

    const promises = selected.map(fieldId => {
      const field = doc.extractedFields.find(f => f.id === fieldId);
      if (field && !field.isVerified) {
        const value = field.editedValue || field.fieldValue;
        return this.documentService.updateField(field.id, value, true).toPromise()
          .then(() => {
            field.isVerified = true;
          });
      }
      return Promise.resolve();
    });

    Promise.all(promises).then(() => {
      this.toastService.success('Fields verified', `${selected.length} fields marked as verified`);
      this.selectedFields.set(new Set());
      this.selectAllChecked.set(false);
    }).catch(() => {
      this.toastService.error('Verification failed', 'Some fields could not be verified');
    });
  }

  bulkVerifyHighConfidence() {
    const doc = this.document();
    if (!doc) return;

    const highConfFields = doc.extractedFields.filter(f => f.confidence > 0.8 && !f.isVerified);

    if (highConfFields.length === 0) {
      this.toastService.info('All high confidence fields already verified', '');
      return;
    }

    const promises = highConfFields.map(field => {
      const value = field.editedValue || field.fieldValue;
      return this.documentService.updateField(field.id, value, true).toPromise()
        .then(() => {
          field.isVerified = true;
        });
    });

    Promise.all(promises).then(() => {
      this.toastService.success('High confidence fields verified', `${highConfFields.length} fields marked as verified`);
    }).catch(() => {
      this.toastService.error('Verification failed', 'Some fields could not be verified');
    });
  }

  // Field grouping
  toggleGroupByCategory() {
    this.groupByCategory.update(v => !v);
  }

  toggleGroupCollapse(category: string) {
    this.collapsedGroups.update(groups => {
      const newSet = new Set(groups);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }

  // Field operations
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

  onRevertField(field: ExtractedField) {
    if (!field.editedValue) return;

    const updatePromise = this.documentService.updateField(field.id, field.fieldValue, field.isVerified).toPromise();

    this.toastService.promise(updatePromise!, {
      loading: 'Reverting field...',
      success: 'Field reverted to original',
      error: 'Failed to revert field'
    });

    updatePromise!.then(() => {
      field.editedValue = undefined;
    }).catch(() => {
      // Error already shown via toast
    });
  }

  onFieldClick(field: ExtractedField) {
    // Clear any existing timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    // Set the active field for highlighting
    this.activeFieldForHighlight.set(field);

    // Auto-clear after 3 seconds
    this.highlightTimeout = setTimeout(() => {
      this.activeFieldForHighlight.set(null);
    }, 3000);

    // If field has no bounding box, show a toast with page number
    if (!field.boundingRegions && field.pageNumber) {
      this.toastService.info(
        'Field Location',
        `${field.fieldName} is on page ${field.pageNumber}`
      );
    }
  }

  onCopyToClipboard(data: { value: string; fieldName: string }) {
    navigator.clipboard.writeText(data.value).then(() => {
      this.toastService.success('Copied!', `${data.fieldName} copied to clipboard`);
    }).catch(() => {
      this.toastService.error('Copy failed', 'Could not copy to clipboard');
    });
  }

  // Export functions
  exportCsv() {
    const doc = this.document();
    if (doc) {
      this.toastService.success('Downloading CSV...', 'Your export will start shortly');
      this.documentService.downloadCsv(doc.id, doc.fileName);
    }
  }

  exportJson() {
    const doc = this.document();
    if (!doc) return;

    const data = {
      documentId: doc.id,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
      processedAt: doc.processedAt,
      fields: doc.extractedFields.map(f => ({
        name: f.fieldName,
        value: f.editedValue || f.fieldValue,
        originalValue: f.fieldValue,
        confidence: f.confidence,
        isVerified: f.isVerified,
        wasEdited: !!f.editedValue
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.fileName.replace(/\.[^/.]+$/, '')}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toastService.success('JSON exported', 'Download started');
  }

  exportSelectedFields() {
    const doc = this.document();
    if (!doc) return;

    const selected = Array.from(this.selectedFields());
    if (selected.length === 0) {
      this.toastService.warning('No fields selected', 'Please select fields to export');
      return;
    }

    const selectedFields = doc.extractedFields.filter(f => selected.includes(f.id));
    const data = {
      documentId: doc.id,
      fileName: doc.fileName,
      exportedFields: selectedFields.length,
      totalFields: doc.extractedFields.length,
      fields: selectedFields.map(f => ({
        name: f.fieldName,
        value: f.editedValue || f.fieldValue,
        confidence: f.confidence,
        isVerified: f.isVerified
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.fileName.replace(/\.[^/.]+$/, '')}_selected.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toastService.success('Selected fields exported', `${selected.length} fields exported`);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

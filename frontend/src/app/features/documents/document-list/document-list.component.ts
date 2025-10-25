import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { debounceTime, Subject } from 'rxjs';
import { DocumentService, PaginationRequest } from '../../../core/services/document.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { ToastService } from '../../../core/services/toast.service';
import { DocumentUploadZoneComponent } from '../document-upload-zone/document-upload-zone.component';
import { DocumentFiltersComponent } from '../document-filters/document-filters.component';
import { DocumentGridViewComponent } from '../document-grid-view/document-grid-view.component';
import { DocumentTableViewComponent } from '../document-table-view/document-table-view.component';
import { AdvancedFiltersPanelComponent, AdvancedFilters } from '../advanced-filters-panel/advanced-filters-panel.component';
import { DocumentPreviewPanelComponent } from '../document-preview-panel/document-preview-panel.component';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    DocumentUploadZoneComponent,
    DocumentFiltersComponent,
    DocumentGridViewComponent,
    DocumentTableViewComponent,
    AdvancedFiltersPanelComponent,
    DocumentPreviewPanelComponent,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmSkeletonImports,
    ...HlmPaginationImports
  ],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.css']
})
export class DocumentListComponent {
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private signalRService = inject(SignalRService);

  // View references
  uploadZone = viewChild(DocumentUploadZoneComponent);

  // Filter state signals
  searchQuery = signal('');
  statusFilter = signal('');
  sortBy = signal('UploadedAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  pageSize = signal(10);
  currentPage = signal(1);

  // UI state signals
  viewMode = signal<'grid' | 'table'>('grid');
  selectedDocuments = signal<Set<string>>(new Set());
  selectAllChecked = signal(false);
  loading = signal(false);
  isLoadingDebounce = signal(false);

  // New: Panel states
  isAdvancedFiltersOpen = signal(false);
  isPreviewPanelOpen = signal(false);
  previewDocumentId = signal<string>('');
  advancedFilters = signal<AdvancedFilters>({
    dateRange: 'all',
    minConfidence: 0,
    fileTypes: [],
    minFieldCount: undefined,
    maxFieldCount: undefined
  });

  // Track processed events to prevent duplicates
  private processedCompleteEvents = new Set<string>();

  // Search debounce subject
  private searchSubject = new Subject<string>();
  private debouncedSearch = toSignal(
    this.searchSubject.pipe(debounceTime(300)),
    { initialValue: '' }
  );

  // Computed signal for pagination request
  private paginationRequest = computed<PaginationRequest>(() => {
    const filters = this.advancedFilters();
    let fromDate: string | undefined;
    let toDate: string | undefined;

    // Convert date range to fromDate/toDate
    if (filters.dateRange !== 'all') {
      const now = new Date();
      if (filters.dateRange === 'last7') {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === 'last30') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === 'last90') {
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === 'custom') {
        fromDate = filters.customStartDate;
        toDate = filters.customEndDate;
      }
    }

    return {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      search: this.searchQuery() || undefined,
      status: this.statusFilter() || undefined,
      fromDate,
      toDate,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      minConfidence: filters.minConfidence > 0 ? filters.minConfidence / 100 : undefined,
      fileTypes: filters.fileTypes.length > 0 ? filters.fileTypes.join(',') : undefined,
      minFieldCount: filters.minFieldCount,
      maxFieldCount: filters.maxFieldCount
    };
  });

  // Load trigger signal
  private loadTrigger = signal(0);

  // Data signals (manual loading for better control)
  documents = signal<any[]>([]);
  paginationData = signal<any>(null);

  // SignalR signals using toSignal
  processingProgress = toSignal(
    this.signalRService.processingProgress$,
    { initialValue: null }
  );

  processingComplete = toSignal(
    this.signalRService.processingComplete$,
    { initialValue: null }
  );

  // Processing progress map
  processingProgressMap = signal<Record<string, any>>({});

  // Computed signals
  hasActiveFilters = computed(() => !!(this.searchQuery() || this.statusFilter()));

  Math = Math; // Expose Math for template

  constructor() {
    // Effect to handle debounced search
    effect(() => {
      const search = this.debouncedSearch();
      if (search !== this.searchQuery()) {
        this.currentPage.set(1);
        this.triggerLoad();
      }
    }, { allowSignalWrites: true });

    // Effect to handle processing progress updates
    effect(() => {
      const progress = this.processingProgress();
      if (progress) {
        this.processingProgressMap.update(map => ({
          ...map,
          [progress.documentId]: progress
        }));
      }
    }, { allowSignalWrites: true });

    // Effect to handle processing complete
    effect(() => {
      const complete = this.processingComplete();
      if (complete) {
        // Create unique key for this event
        const eventKey = `${complete.documentId}-${complete.timestamp}`;

        // Skip if we've already processed this event
        if (this.processedCompleteEvents.has(eventKey)) {
          return;
        }

        // Mark as processed
        this.processedCompleteEvents.add(eventKey);

        // Clean up old events (keep only last 100)
        if (this.processedCompleteEvents.size > 100) {
          const values = Array.from(this.processedCompleteEvents);
          this.processedCompleteEvents.clear();
          values.slice(-50).forEach(v => this.processedCompleteEvents.add(v));
        }

        // Remove from progress tracking
        this.processingProgressMap.update(map => {
          const { [complete.documentId]: removed, ...remaining } = map;
          return remaining;
        });

        // Show toast notification
        if (complete.success) {
          this.toastService.success('Document processed successfully!', 'All fields have been extracted');
        } else {
          this.toastService.error('Document processing failed', 'Please try uploading again');
        }

        // Reload documents with debounce protection
        this.triggerLoadWithDebounce();
      }
    }, { allowSignalWrites: true });

    // Initial load
    this.loadDocuments();
  }

  private triggerLoad() {
    this.loadTrigger.update(v => v + 1);
    this.loadDocuments();
  }

  private triggerLoadWithDebounce() {
    // Prevent rapid-fire loads
    if (this.isLoadingDebounce()) {
      console.log('Load debounced - skipping');
      return;
    }

    this.isLoadingDebounce.set(true);
    setTimeout(() => {
      this.isLoadingDebounce.set(false);
    }, 1000); // 1 second debounce

    this.triggerLoad();
  }

  private loadDocuments() {
    // Prevent loading if already loading
    if (this.loading()) {
      console.log('Already loading - skipping duplicate request');
      return;
    }

    this.loading.set(true);
    this.documentService.getDocumentsPaginated(this.paginationRequest()).subscribe({
      next: (response) => {
        this.documents.set(response.data);
        this.paginationData.set(response);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Failed to load documents', err.error?.error || err.message);
      }
    });
  }

  // Filter event handlers
  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.triggerLoad();
  }

  onPageSizeChange() {
    this.currentPage.set(1);
    this.triggerLoad();
  }

  onClearFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.sortBy.set('UploadedAt');
    this.sortOrder.set('desc');
    this.currentPage.set(1);
    this.triggerLoad();
  }

  // Upload event handlers
  onFilesQueued(files: File[]) {
    const invalidCount = files.length - files.length; // Handled in child component
    if (invalidCount > 0) {
      this.toastService.warning('Invalid files skipped',
        `${invalidCount} file(s) were not valid (PDF, PNG, JPG, JPEG, TIFF only)`);
    }
  }

  onUploadRequested() {
    const zone = this.uploadZone();
    if (!zone) return;

    const files = zone.fileQueue().map(f => f.file);
    if (files.length === 0) return;

    zone.setUploading(true);
    let uploadedCount = 0;
    let failedCount = 0;

    files.forEach(file => {
      this.documentService.uploadDocument(file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount + failedCount === files.length) {
            this.finishMultiUpload(uploadedCount, failedCount, zone);
          }
        },
        error: () => {
          failedCount++;
          if (uploadedCount + failedCount === files.length) {
            this.finishMultiUpload(uploadedCount, failedCount, zone);
          }
        }
      });
    });
  }

  private finishMultiUpload(uploaded: number, failed: number, zone: DocumentUploadZoneComponent) {
    zone.setUploading(false);
    zone.clearQueue();
    this.triggerLoad();

    if (failed === 0) {
      this.toastService.success(
        `${uploaded} document(s) uploaded successfully!`,
        'Processing will begin shortly'
      );
    } else if (uploaded === 0) {
      this.toastService.error('Upload failed', `All ${failed} document(s) failed to upload`);
    } else {
      this.toastService.warning('Partial upload', `${uploaded} succeeded, ${failed} failed`);
    }
  }

  // Selection event handlers
  onSelectionToggled(documentId: string) {
    this.selectedDocuments.update(selected => {
      const newSet = new Set(selected);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
    this.updateSelectAllState();
  }

  onSelectAllToggled() {
    if (this.selectAllChecked()) {
      this.selectedDocuments.set(new Set());
      this.selectAllChecked.set(false);
    } else {
      const allIds = new Set(this.documents().map(doc => doc.id));
      this.selectedDocuments.set(allIds);
      this.selectAllChecked.set(true);
    }
  }

  private updateSelectAllState() {
    const selected = this.selectedDocuments();
    const allDocs = this.documents();
    this.selectAllChecked.set(allDocs.length > 0 && allDocs.every(doc => selected.has(doc.id)));
  }

  // Download handler
  onDownloadCsv(data: { id: string; fileName: string }) {
    this.toastService.info('Downloading CSV...', 'Your export will start shortly');
    this.documentService.downloadCsv(data.id, data.fileName);
  }

  // Bulk actions
  bulkDelete() {
    const selected = Array.from(this.selectedDocuments());
    if (selected.length === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selected.length} document(s)? This action cannot be undone.`);
    if (!confirmed) return;

    this.toastService.info('Deleting documents...', `Removing ${selected.length} document(s)`);
    this.selectedDocuments.set(new Set());
    this.triggerLoad();
  }

  bulkExport() {
    const selected = Array.from(this.selectedDocuments());
    if (selected.length === 0) return;

    this.toastService.info('Exporting documents...', `Preparing ${selected.length} document(s)`);

    selected.forEach(docId => {
      const doc = this.documents().find(d => d.id === docId);
      if (doc && doc.status === 2) {
        this.onDownloadCsv({ id: docId, fileName: doc.fileName });
      }
    });
  }

  clearSelectedDocuments() {
    this.selectedDocuments.set(new Set());
    this.selectAllChecked.set(false);
  }

  // View mode
  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
  }

  // Pagination
  goToPage(page: number) {
    this.currentPage.set(page);
    this.triggerLoad();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): (number | string)[] {
    const pagination = this.paginationData();
    if (!pagination) return [];

    const total = pagination.totalPages;
    const current = pagination.page;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }

  // New: Panel management methods
  toggleAdvancedFilters() {
    this.isAdvancedFiltersOpen.update(v => !v);
  }

  closeAdvancedFilters() {
    this.isAdvancedFiltersOpen.set(false);
  }

  applyAdvancedFilters(filters: AdvancedFilters) {
    this.advancedFilters.set(filters);
    this.currentPage.set(1);
    this.triggerLoad();
    this.toastService.success('Filters applied', 'Document list updated');
  }

  openDocumentPreview(documentId: string) {
    this.previewDocumentId.set(documentId);
    this.isPreviewPanelOpen.set(true);
  }

  closePreviewPanel() {
    this.isPreviewPanelOpen.set(false);
  }
}

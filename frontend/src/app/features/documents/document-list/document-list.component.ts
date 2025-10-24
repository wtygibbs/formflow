import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { DocumentListItem, DocumentService, PaginatedResponse, PaginationRequest } from '../../../core/services/document.service';
import { ProcessingProgress, SignalRService } from '../../../core/services/signalr.service';
import { ToastService } from '../../../core/services/toast.service';

interface QueuedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  sizeFormatted: string;
}

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CdkDropList,
    CdkDrag,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    ...HlmPaginationImports,
    ...HlmProgressImports,
    ...HlmIconImports,
    ...BrnSelectImports
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-3xl font-bold">Documents</h1>
      </div>

      <!-- Upload Zone -->
      <div hlmCard>
        <div hlmCardContent>
          <div
            cdkDropList
            (cdkDropListDropped)="onFilesDropped($event)"
            class="border-2 border-dashed rounded-lg transition-all duration-200"
            [class.border-primary]="isDraggingOver()"
            [class.bg-primary/5]="isDraggingOver()"
            [class.border-muted-foreground/30]="!isDraggingOver()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <div class="p-8 text-center">
              @if (fileQueue().length === 0) {
                <!-- Empty State -->
                <div class="space-y-4">
                  <div class="flex justify-center">
                    <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span class="text-3xl">📄</span>
                    </div>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold mb-1">Drop files here to upload</h3>
                    <p class="text-sm text-muted-foreground mb-4">
                      or click to browse • PDF, PNG, JPG, JPEG, TIFF • Max 10MB
                    </p>
                  </div>
                  <label hlmBtn class="cursor-pointer">
                    <input
                      #fileInput
                      type="file"
                      (change)="onFileSelected($event)"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff"
                      multiple
                      hidden
                    />
                    Browse Files
                  </label>
                </div>
              } @else {
                <!-- File Queue -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">
                      {{ fileQueue().length }} file(s) ready to upload
                    </h3>
                    <div class="flex gap-2">
                      <button hlmBtn variant="outline" size="sm" (click)="clearQueue()">
                        Clear All
                      </button>
                      <button hlmBtn size="sm" (click)="uploadQueuedFiles()" [disabled]="uploading()">
                        @if (uploading()) {
                          <hlm-spinner class="size-4 mr-2" />
                        }
                        Upload {{ fileQueue().length }} File(s)
                      </button>
                    </div>
                  </div>

                  <!-- File List -->
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (queuedFile of fileQueue(); track queuedFile.id) {
                      <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <!-- File Icon -->
                        <div class="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                          @switch (queuedFile.type) {
                            @case ('application/pdf') {
                              <span class="text-lg">📄</span>
                            }
                            @case ('image/png') {
                              <span class="text-lg">🖼️</span>
                            }
                            @case ('image/jpeg') {
                              <span class="text-lg">🖼️</span>
                            }
                            @case ('image/jpg') {
                              <span class="text-lg">🖼️</span>
                            }
                            @case ('image/tiff') {
                              <span class="text-lg">🖼️</span>
                            }
                            @default {
                              <span class="text-lg">📎</span>
                            }
                          }
                        </div>

                        <!-- File Info -->
                        <div class="flex-1 min-w-0">
                          <p class="font-medium text-sm truncate" [title]="queuedFile.name">
                            {{ queuedFile.name }}
                          </p>
                          <p class="text-xs text-muted-foreground">
                            {{ queuedFile.sizeFormatted }}
                          </p>
                        </div>

                        <!-- Remove Button -->
                        <button
                          hlmBtn
                          variant="ghost"
                          size="sm"
                          class="flex-shrink-0"
                          (click)="removeFromQueue(queuedFile.id)"
                          [disabled]="uploading()"
                        >
                          ✕
                        </button>
                      </div>
                    }
                  </div>

                  <!-- Add More Files -->
                  <div class="pt-3 border-t">
                    <label hlmBtn variant="outline" size="sm" class="cursor-pointer">
                      <input
                        type="file"
                        (change)="onFileSelected($event)"
                        accept=".pdf,.png,.jpg,.jpeg,.tiff"
                        multiple
                        hidden
                      />
                      + Add More Files
                    </label>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div hlmCard>
        <div hlmCardContent class="space-y-4">
          <!-- Search Bar -->
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <input
                hlmInput
                type="text"
                placeholder="Search by file name..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                class="w-full"
              />
            </div>
          </div>

          <!-- Filters Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Status Filter -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Status</label>
              <brn-select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" placeholder="All Statuses">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value />
                </hlm-select-trigger>
                <hlm-select-content>
                  <hlm-option value="">All Statuses</hlm-option>
                  <hlm-option value="Uploaded">Uploaded</hlm-option>
                  <hlm-option value="Processing">Processing</hlm-option>
                  <hlm-option value="Completed">Completed</hlm-option>
                  <hlm-option value="Failed">Failed</hlm-option>
                </hlm-select-content>
              </brn-select>
            </div>

            <!-- Sort By -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Sort By</label>
              <brn-select [(ngModel)]="sortBy" (ngModelChange)="onFilterChange()" placeholder="Sort by">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value />
                </hlm-select-trigger>
                <hlm-select-content>
                  <hlm-option value="UploadedAt">Upload Date</hlm-option>
                  <hlm-option value="FileName">File Name</hlm-option>
                  <hlm-option value="Status">Status</hlm-option>
                  <hlm-option value="ProcessedAt">Processed Date</hlm-option>
                </hlm-select-content>
              </brn-select>
            </div>

            <!-- Sort Order -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Order</label>
              <brn-select [(ngModel)]="sortOrder" (ngModelChange)="onFilterChange()" placeholder="Order">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value />
                </hlm-select-trigger>
                <hlm-select-content>
                  <hlm-option value="desc">Newest First</hlm-option>
                  <hlm-option value="asc">Oldest First</hlm-option>
                </hlm-select-content>
              </brn-select>
            </div>

            <!-- Page Size -->
            <div>
              <label class="text-sm font-medium mb-1.5 block">Per Page</label>
              <brn-select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()" placeholder="Page size">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value />
                </hlm-select-trigger>
                <hlm-select-content>
                  <hlm-option value="10">10</hlm-option>
                  <hlm-option value="25">25</hlm-option>
                  <hlm-option value="50">50</hlm-option>
                  <hlm-option value="100">100</hlm-option>
                </hlm-select-content>
              </brn-select>
            </div>
          </div>

          <!-- Results Summary -->
          @if (!loading() && paginationData()) {
            <div class="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>
                Showing {{ ((paginationData()!.page - 1) * paginationData()!.pageSize) + 1 }} to
                {{ Math.min(paginationData()!.page * paginationData()!.pageSize, paginationData()!.totalCount) }}
                of {{ paginationData()!.totalCount }} documents
              </span>
              @if (hasActiveFilters()) {
                <button hlmBtn variant="ghost" size="sm" (click)="clearFilters()">
                  Clear Filters
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- View Mode Toggle & Bulk Actions -->
      @if (!loading() && documents().length > 0) {
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <!-- View Mode Toggle -->
          <div class="flex gap-1 border rounded-md p-1">
            <button
              hlmBtn
              [variant]="viewMode() === 'grid' ? 'default' : 'ghost'"
              size="sm"
              (click)="setViewMode('grid')"
              class="gap-2"
            >
              <span class="text-lg">⊞</span> Grid
            </button>
            <button
              hlmBtn
              [variant]="viewMode() === 'table' ? 'default' : 'ghost'"
              size="sm"
              (click)="setViewMode('table')"
              class="gap-2"
            >
              <span class="text-lg">☰</span> Table
            </button>
          </div>

          <!-- Bulk Actions Toolbar -->
          @if (selectedDocuments().size > 0) {
            <div class="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-md">
              <span class="text-sm font-medium">{{ selectedDocuments().size }} selected</span>
              <div class="flex gap-2">
                <button hlmBtn variant="outline" size="sm" (click)="bulkExport()">
                  Export All
                </button>
                <button hlmBtn variant="destructive" size="sm" (click)="bulkDelete()">
                  Delete All
                </button>
                <button hlmBtn variant="ghost" size="sm" (click)="clearSelectedDocuments()">
                  Clear
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Content -->
      @if (loading()) {
        <!-- Skeleton Loaders -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div hlmCard>
              <div hlmCardContent class="space-y-4">
                <div class="flex justify-between items-start">
                  <hlm-skeleton class="h-5 w-2/3" />
                  <hlm-skeleton class="h-5 w-16" />
                </div>
                <div class="space-y-2">
                  <hlm-skeleton class="h-4 w-full" />
                  <hlm-skeleton class="h-4 w-3/4" />
                  <hlm-skeleton class="h-4 w-1/2" />
                </div>
                <div class="flex gap-2">
                  <hlm-skeleton class="h-9 flex-1" />
                  <hlm-skeleton class="h-9 w-20" />
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (documents().length === 0) {
        <!-- Empty State -->
        <div hlmCard>
          <div hlmCardContent class="flex flex-col items-center text-center py-16">
            @if (hasActiveFilters()) {
              <h2 class="text-2xl font-semibold mb-2">No Documents Found</h2>
              <p class="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
              <button hlmBtn variant="outline" (click)="clearFilters()">Clear Filters</button>
            } @else {
              <h2 class="text-2xl font-semibold mb-2">No Documents Yet</h2>
              <p class="text-muted-foreground mb-6">Use the upload zone above to add your first ACORD 125 form</p>
            }
          </div>
        </div>
      } @else {
        <!-- Grid View -->
        @if (viewMode() === 'grid') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (doc of documents(); track doc.id) {
              <div hlmCard class="hover:shadow-md transition-shadow relative">
                <div hlmCardContent>
                  <!-- Selection Checkbox -->
                  <div class="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      [checked]="selectedDocuments().has(doc.id)"
                      (change)="toggleDocumentSelection(doc.id)"
                      class="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  <div class="flex justify-between items-start mb-3 pl-8">
                    <h3 class="text-base font-semibold truncate flex-1 mr-2" [title]="doc.fileName">{{ doc.fileName }}</h3>
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
                <!-- Real-time Processing Progress -->
                @if (doc.status === 1 && processingProgress()[doc.id]; as progress) {
                  <div class="space-y-2 mb-3">
                    <div class="flex justify-between text-xs">
                      <span class="text-muted-foreground">{{ progress.currentStep }}</span>
                      <span class="font-medium">{{ progress.percentComplete }}%</span>
                    </div>
                    <hlm-progress [value]="progress.percentComplete" class="h-2" />
                    @if (progress.processedFields > 0) {
                      <p class="text-xs text-muted-foreground">
                        Fields: {{ progress.processedFields }}/{{ progress.totalFields }}
                        @if (progress.estimatedSecondsRemaining) {
                          • ETA: {{ progress.estimatedSecondsRemaining }}s
                        }
                      </p>
                    }
                  </div>
                }

                <div class="space-y-1 text-sm text-muted-foreground">
                  <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                  @if (doc.processedAt) {
                    <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                  }
                  @if (doc.status !== 1) {
                    <p>Fields: {{ doc.extractedFieldsCount }}</p>
                  }
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

        <!-- Table View -->
        @if (viewMode() === 'table') {
          <div hlmCard>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="border-b">
                  <tr class="text-left">
                    <th class="p-4 w-12">
                      <input
                        type="checkbox"
                        [checked]="selectAllChecked()"
                        (change)="toggleSelectAll()"
                        class="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th class="p-4 font-semibold">File Name</th>
                    <th class="p-4 font-semibold">Status</th>
                    <th class="p-4 font-semibold">Uploaded</th>
                    <th class="p-4 font-semibold">Processed</th>
                    <th class="p-4 font-semibold text-center">Fields</th>
                    <th class="p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (doc of documents(); track doc.id) {
                    <tr class="border-b hover:bg-muted/50 transition-colors">
                      <td class="p-4">
                        <input
                          type="checkbox"
                          [checked]="selectedDocuments().has(doc.id)"
                          (change)="toggleDocumentSelection(doc.id)"
                          class="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td class="p-4">
                        <div class="font-medium truncate max-w-xs" [title]="doc.fileName">
                          {{ doc.fileName }}
                        </div>
                      </td>
                      <td class="p-4">
                        @switch (doc.status) {
                          @case (0) {
                            <span hlmBadge variant="secondary">Uploaded</span>
                          }
                          @case (1) {
                            <div class="flex items-center gap-2">
                              <span hlmBadge variant="outline" class="border-yellow-500 text-yellow-600">Processing</span>
                              @if (processingProgress()[doc.id]; as progress) {
                                <span class="text-xs text-muted-foreground">{{ progress.percentComplete }}%</span>
                              }
                            </div>
                          }
                          @case (2) {
                            <span hlmBadge class="bg-green-600 text-white">Completed</span>
                          }
                          @case (3) {
                            <span hlmBadge variant="destructive">Failed</span>
                          }
                        }
                      </td>
                      <td class="p-4 text-sm text-muted-foreground">
                        {{ formatDate(doc.uploadedAt) }}
                      </td>
                      <td class="p-4 text-sm text-muted-foreground">
                        {{ doc.processedAt ? formatDate(doc.processedAt) : '-' }}
                      </td>
                      <td class="p-4 text-center">
                        <span class="text-sm font-medium">{{ doc.extractedFieldsCount }}</span>
                      </td>
                      <td class="p-4">
                        <div class="flex gap-2">
                          <a hlmBtn size="sm" variant="outline" [routerLink]="['/documents', doc.id]">
                            View
                          </a>
                          @if (doc.status === 2) {
                            <button hlmBtn variant="ghost" size="sm" (click)="downloadCsv(doc.id, doc.fileName)">
                              CSV
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Pagination -->
        @if (paginationData() && paginationData()!.totalPages > 1) {
          <div class="flex justify-center mt-8">
            <nav hlmPaginationContent>
              <!-- Previous Button -->
              <button
                hlmPaginationPrevious
                [disabled]="!paginationData()!.hasPreviousPage"
                (click)="goToPage(paginationData()!.page - 1)"
              >
                Previous
              </button>

              <!-- Page Numbers -->
              @for (page of getPageNumbers(); track page) {
                @if (page === '...') {
                  <span hlmPaginationEllipsis>...</span>
                } @else {
                  <button
                    hlmPaginationLink
                    [isActive]="page === paginationData()!.page"
                    (click)="goToPage($any(page))"
                  >
                    {{ page }}
                  </button>
                }
              }

              <!-- Next Button -->
              <button
                hlmPaginationNext
                [disabled]="!paginationData()!.hasNextPage"
                (click)="goToPage(paginationData()!.page + 1)"
              >
                Next
              </button>
            </nav>
          </div>
        }
      }
    </div>
  `,
  styles: []
})
export class DocumentListComponent implements OnInit, OnDestroy {
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);
  private signalRService = inject(SignalRService);

  // Data signals
  documents = signal<DocumentListItem[]>([]);
  paginationData = signal<PaginatedResponse<DocumentListItem> | null>(null);
  loading = signal(true);
  uploading = signal(false);
  processingProgress = signal<Record<string, ProcessingProgress>>({});

  // Filter state
  searchQuery = '';
  statusFilter = '';
  sortBy = 'UploadedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  pageSize = 10;
  currentPage = 1;

  // Drag-and-drop state
  isDraggingOver = signal(false);
  fileQueue = signal<QueuedFile[]>([]);

  // View mode state
  viewMode = signal<'grid' | 'table'>('grid');

  // Bulk selection state
  selectedDocuments = signal<Set<string>>(new Set());
  selectAllChecked = signal(false);

  // Search debounce
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private dragCounter = 0; // Prevents flickering

  // Expose Math for template
  Math = Math;

  constructor() {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadDocuments();
    });
  }

  ngOnInit() {
    this.loadDocuments();
    this.setupSignalRSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSignalRSubscriptions() {
    // Subscribe to processing progress
    const progressSub = this.signalRService.processingProgress$.subscribe(progress => {
      const currentProgress = this.processingProgress();
      this.processingProgress.set({
        ...currentProgress,
        [progress.documentId]: progress
      });
    });

    // Subscribe to processing complete
    const completeSub = this.signalRService.processingComplete$.subscribe(complete => {
      // Remove from progress tracking
      const currentProgress = this.processingProgress();
      const { [complete.documentId]: removed, ...remaining } = currentProgress;
      this.processingProgress.set(remaining);

      // Show toast notification
      if (complete.success) {
        this.toastService.success('Document processed successfully!', 'All fields have been extracted');
      } else {
        this.toastService.error('Document processing failed', 'Please try uploading again');
      }

      // Reload documents to get updated status
      this.loadDocuments();
    });

    this.subscriptions.push(progressSub, completeSub);
  }

  loadDocuments() {
    this.loading.set(true);

    const params: PaginationRequest = {
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.documentService.getDocumentsPaginated(params).subscribe({
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

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadDocuments();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.loadDocuments();
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadDocuments();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): (number | string)[] {
    const total = this.paginationData()?.totalPages || 1;
    const current = this.paginationData()?.page || 1;
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

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.statusFilter);
  }

  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.sortBy = 'UploadedAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadDocuments();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFilesToQueue(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  downloadCsv(documentId: string, fileName: string) {
    this.toastService.info('Downloading CSV...', 'Your export will start shortly');
    this.documentService.downloadCsv(documentId, fileName);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Improved drag-and-drop handlers (prevents flickering)
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Only set dragging state on first enter
    if (this.dragCounter === 0) {
      this.isDraggingOver.set(true);
    }
    this.dragCounter++;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Only clear dragging state when fully leaving
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDraggingOver.set(false);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingOver.set(false);
    this.dragCounter = 0;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addFilesToQueue(Array.from(files));
    }
  }

  onFilesDropped(event: CdkDragDrop<any>) {
    // This is for CDK drop list - we handle via onDrop instead
  }

  // File queue management
  addFilesToQueue(files: File[]) {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const newFiles: QueuedFile[] = [];
    let invalidCount = 0;
    let oversizedCount = 0;

    files.forEach(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(extension)) {
        invalidCount++;
        return;
      }

      if (file.size > maxFileSize) {
        oversizedCount++;
        this.toastService.warning('File too large', `${file.name} exceeds 10MB limit`);
        return;
      }

      newFiles.push({
        file,
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        sizeFormatted: this.formatFileSize(file.size)
      });
    });

    if (invalidCount > 0) {
      this.toastService.warning('Invalid files skipped',
        `${invalidCount} file(s) were not valid (PDF, PNG, JPG, JPEG, TIFF only)`);
    }

    if (newFiles.length > 0) {
      this.fileQueue.set([...this.fileQueue(), ...newFiles]);
    }
  }

  removeFromQueue(id: string) {
    this.fileQueue.set(this.fileQueue().filter(f => f.id !== id));
  }

  clearQueue() {
    this.fileQueue.set([]);
  }

  uploadQueuedFiles() {
    const files = this.fileQueue().map(f => f.file);
    if (files.length === 0) return;

    this.uploading.set(true);
    let uploadedCount = 0;
    let failedCount = 0;

    files.forEach(file => {
      this.documentService.uploadDocument(file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount + failedCount === files.length) {
            this.finishMultiUpload(uploadedCount, failedCount);
          }
        },
        error: () => {
          failedCount++;
          if (uploadedCount + failedCount === files.length) {
            this.finishMultiUpload(uploadedCount, failedCount);
          }
        }
      });
    });
  }

  private finishMultiUpload(uploaded: number, failed: number) {
    this.uploading.set(false);
    this.clearQueue();
    this.loadDocuments();

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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Bulk selection handlers
  toggleDocumentSelection(documentId: string) {
    const selected = new Set(this.selectedDocuments());
    if (selected.has(documentId)) {
      selected.delete(documentId);
    } else {
      selected.add(documentId);
    }
    this.selectedDocuments.set(selected);
    this.updateSelectAllState();
  }

  toggleSelectAll() {
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

  bulkDelete() {
    const selected = Array.from(this.selectedDocuments());
    if (selected.length === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selected.length} document(s)? This action cannot be undone.`);
    if (!confirmed) return;

    this.toastService.info('Deleting documents...', `Removing ${selected.length} document(s)`);

    // Note: You'll need to add a delete endpoint to your API
    // For now, this shows the UI pattern
    this.selectedDocuments.set(new Set());
    this.loadDocuments();
  }

  bulkExport() {
    const selected = Array.from(this.selectedDocuments());
    if (selected.length === 0) return;

    this.toastService.info('Exporting documents...', `Preparing ${selected.length} document(s)`);

    selected.forEach(docId => {
      const doc = this.documents().find(d => d.id === docId);
      if (doc && doc.status === 2) {
        this.downloadCsv(docId, doc.fileName);
      }
    });
  }

  // View mode toggle
  setViewMode(mode: 'grid' | 'table') {
    this.viewMode.set(mode);
  }

  clearSelectedDocuments() {
    this.selectedDocuments.set(new Set());
  }
}

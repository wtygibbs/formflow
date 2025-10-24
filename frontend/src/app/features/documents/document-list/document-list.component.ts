import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { debounceTime, Subject } from 'rxjs';
import { DocumentListItem, DocumentService, PaginatedResponse, PaginationRequest } from '../../../core/services/document.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...HlmSkeletonImports,
    ...HlmPaginationImports,
    ...BrnSelectImports
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-3xl font-bold">Documents</h1>
        <label hlmBtn class="cursor-pointer w-full sm:w-auto">
          <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
          Upload Document
        </label>
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

      <!-- Uploading Alert -->
      @if (uploading()) {
        <div hlmAlert class="flex items-center gap-2">
          <hlm-spinner class="size-4" />
          <p hlmAlertDescription>Uploading document...</p>
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
              <p class="text-muted-foreground mb-6">Upload your first ACORD 125 form to get started</p>
              <label hlmBtn class="cursor-pointer">
                <input type="file" (change)="onFileSelected($event)" accept=".pdf,.png,.jpg,.jpeg,.tiff" hidden />
                Upload Your First Document
              </label>
            }
          </div>
        </div>
      } @else {
        <!-- Document Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of documents(); track doc.id) {
            <div hlmCard class="hover:shadow-md transition-shadow">
              <div hlmCardContent>
                <div class="flex justify-between items-start mb-3">
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
                <div class="space-y-1 text-sm text-muted-foreground">
                  <p>Uploaded: {{ formatDate(doc.uploadedAt) }}</p>
                  @if (doc.processedAt) {
                    <p>Processed: {{ formatDate(doc.processedAt) }}</p>
                  }
                  <p>Fields: {{ doc.extractedFieldsCount }}</p>
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
                    (click)="goToPage(page as number)"
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
export class DocumentListComponent implements OnInit {
  private documentService = inject(DocumentService);
  private toastService = inject(ToastService);

  // Data signals
  documents = signal<DocumentListItem[]>([]);
  paginationData = signal<PaginatedResponse<DocumentListItem> | null>(null);
  loading = signal(true);
  uploading = signal(false);

  // Filter state
  searchQuery = '';
  statusFilter = '';
  sortBy = 'UploadedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  pageSize = 10;
  currentPage = 1;

  // Search debounce
  private searchSubject = new Subject<string>();

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
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadDocument(file);
      input.value = ''; // Reset input
    }
  }

  uploadDocument(file: File) {
    this.uploading.set(true);

    const uploadPromise = this.documentService.uploadDocument(file).toPromise();

    this.toastService.promise(uploadPromise!, {
      loading: 'Uploading document...',
      success: 'Document uploaded successfully!',
      error: 'Failed to upload document'
    });

    uploadPromise!.then(() => {
      this.uploading.set(false);
      this.loadDocuments();
    }).catch(() => {
      this.uploading.set(false);
    });
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
}

import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { PaginatedResponse } from '../../../core/services/document.service';

@Component({
  selector: 'app-document-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...HlmCardImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...HlmButtonImports,
    ...BrnSelectImports
  ],
  templateUrl: './document-filters.component.html',
  styleUrls: ['./document-filters.component.css']
})
export class DocumentFiltersComponent {
  // Input signals (from parent)
  loading = input<boolean>(false);
  paginationData = input<PaginatedResponse<any> | null>(null);

  // Two-way binding with model signals
  searchQuery = model<string>('');
  statusFilter = model<string>('');
  sortBy = model<string>('UploadedAt');
  sortOrder = model<'asc' | 'desc'>('desc');
  pageSize = model<number>(10);

  // Output events
  searchChanged = output<string>();
  filterChanged = output<void>();
  pageSizeChanged = output<void>();
  clearFilters = output<void>();

  // Expose Math for template
  Math = Math;

  onSearchChange(value: string) {
    this.searchChanged.emit(value);
  }

  onFilterChange() {
    this.filterChanged.emit();
  }

  onPageSizeChange() {
    this.pageSizeChanged.emit();
  }

  onClearFilters() {
    this.clearFilters.emit();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery() || this.statusFilter());
  }
}

import { Component, output, signal, computed, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';

export interface AdvancedFilters {
  dateRange: 'all' | 'last7' | 'last30' | 'last90' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  minConfidence: number;
  fileTypes: string[];
  minFieldCount?: number;
  maxFieldCount?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilters;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  dateRange: 'all',
  minConfidence: 0,
  fileTypes: [],
  minFieldCount: undefined,
  maxFieldCount: undefined
};

const BUILTIN_PRESETS: FilterPreset[] = [
  {
    id: 'high-quality',
    name: 'High Quality Documents',
    filters: {
      dateRange: 'all',
      minConfidence: 90,
      fileTypes: [],
      minFieldCount: undefined,
      maxFieldCount: undefined
    }
  },
  {
    id: 'needs-review',
    name: 'Needs Review',
    filters: {
      dateRange: 'all',
      minConfidence: 0,
      fileTypes: [],
      minFieldCount: undefined,
      maxFieldCount: undefined
    }
  },
  {
    id: 'recent-pdfs',
    name: 'Recent PDFs',
    filters: {
      dateRange: 'last7',
      minConfidence: 0,
      fileTypes: ['pdf'],
      minFieldCount: undefined,
      maxFieldCount: undefined
    }
  }
];

@Component({
  selector: 'app-advanced-filters-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmBadgeImports,
    ...HlmSelectImports,
    ...BrnSelectImports
  ],
  templateUrl: './advanced-filters-panel.component.html',
  styleUrls: ['./advanced-filters-panel.component.css']
})
export class AdvancedFiltersPanelComponent {
  // Two-way binding for filters
  filters = model<AdvancedFilters>(DEFAULT_FILTERS);

  // Output events
  filtersApplied = output<AdvancedFilters>();
  filtersClosed = output<void>();

  // Local state
  customPresets = signal<FilterPreset[]>([]);
  builtinPresets = signal<FilterPreset[]>(BUILTIN_PRESETS);
  selectedPreset = signal<string | null>(null);

  // Available file types
  availableFileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPG/JPEG' },
    { value: 'tiff', label: 'TIFF' }
  ];

  // Computed
  allPresets = computed(() => [...this.builtinPresets(), ...this.customPresets()]);

  hasActiveFilters = computed(() => {
    const f = this.filters();
    return f.dateRange !== 'all' ||
           f.minConfidence > 0 ||
           f.fileTypes.length > 0 ||
           f.minFieldCount !== undefined ||
           f.maxFieldCount !== undefined;
  });

  constructor() {
    // Load custom presets from localStorage
    this.loadCustomPresets();
  }

  onDateRangeChange(range: string) {
    this.filters.update(f => ({ ...f, dateRange: range as any }));
  }

  onConfidenceChange(value: string) {
    this.filters.update(f => ({ ...f, minConfidence: parseInt(value) }));
  }

  toggleFileType(fileType: string) {
    this.filters.update(f => {
      const types = [...f.fileTypes];
      const index = types.indexOf(fileType);
      if (index > -1) {
        types.splice(index, 1);
      } else {
        types.push(fileType);
      }
      return { ...f, fileTypes: types };
    });
  }

  isFileTypeSelected(fileType: string): boolean {
    return this.filters().fileTypes.includes(fileType);
  }

  applyFilters() {
    this.filtersApplied.emit(this.filters());
  }

  clearFilters() {
    this.filters.set({ ...DEFAULT_FILTERS });
    this.selectedPreset.set(null);
    this.filtersApplied.emit(this.filters());
  }

  closePanel() {
    this.filtersClosed.emit();
  }

  loadPreset(presetId: string) {
    const preset = this.allPresets().find(p => p.id === presetId);
    if (preset) {
      this.filters.set({ ...preset.filters });
      this.selectedPreset.set(presetId);
    }
  }

  saveAsPreset() {
    const name = prompt('Enter a name for this filter preset:');
    if (!name) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      filters: { ...this.filters() }
    };

    this.customPresets.update(presets => [...presets, newPreset]);
    this.saveCustomPresets();
    this.selectedPreset.set(newPreset.id);
  }

  deletePreset(presetId: string) {
    if (!presetId.startsWith('custom-')) return; // Can't delete built-in presets

    const confirmed = confirm('Delete this preset?');
    if (!confirmed) return;

    this.customPresets.update(presets => presets.filter(p => p.id !== presetId));
    this.saveCustomPresets();

    if (this.selectedPreset() === presetId) {
      this.selectedPreset.set(null);
    }
  }

  private loadCustomPresets() {
    const stored = localStorage.getItem('document-filter-presets');
    if (stored) {
      try {
        const presets = JSON.parse(stored);
        this.customPresets.set(presets);
      } catch (e) {
        console.error('Failed to load custom presets', e);
      }
    }
  }

  private saveCustomPresets() {
    localStorage.setItem('document-filter-presets', JSON.stringify(this.customPresets()));
  }
}

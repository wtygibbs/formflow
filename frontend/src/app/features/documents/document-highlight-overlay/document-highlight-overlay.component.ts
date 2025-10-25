import { Component, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BoundingRegion {
  page: number;
  polygon: Array<{x: number; y: number}>;
}

interface HighlightBox {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
}

@Component({
  selector: 'app-document-highlight-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 pointer-events-none z-10">
      @if (highlightBox(); as box) {
        <div
          class="absolute border-4 border-yellow-400 bg-yellow-200/30 transition-all duration-300 pointer-events-none animate-pulse-once"
          [style.left.%]="box.left"
          [style.top.%]="box.top"
          [style.width.%]="box.width"
          [style.height.%]="box.height"
          [class.opacity-100]="box.visible"
          [class.opacity-0]="!box.visible"
        ></div>
      }
    </div>
  `,
  styles: [`
    @keyframes pulse-once {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-pulse-once {
      animation: pulse-once 0.8s ease-in-out 2;
    }
  `]
})
export class DocumentHighlightOverlayComponent {
  activeFieldId = input<string | null>(null);
  boundingRegions = input<string | null>(null);
  pageNumber = input<number | null>(null);
  currentPage = input<number>(1);

  private hideTimeout: any;

  highlightBox = computed<HighlightBox | null>(() => {
    const regions = this.boundingRegions();
    const fieldId = this.activeFieldId();
    const page = this.currentPage();

    if (!regions || !fieldId) return null;

    try {
      const parsed: BoundingRegion[] = JSON.parse(regions);
      const pageRegion = parsed.find(r => r.page === page);

      if (!pageRegion || !pageRegion.polygon || pageRegion.polygon.length === 0) {
        return null;
      }

      // Convert polygon to bounding box
      // Coordinates are normalized (0-1), multiply by 100 for percentage
      const xs = pageRegion.polygon.map(p => p.x * 100);
      const ys = pageRegion.polygon.map(p => p.y * 100);

      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);

      return {
        left,
        top,
        width: right - left,
        height: bottom - top,
        visible: true
      };
    } catch (error) {
      console.error('Failed to parse bounding regions:', error);
      return null;
    }
  });

  constructor() {
    // Auto-hide after 3 seconds
    effect(() => {
      const fieldId = this.activeFieldId();

      // Clear any existing timeout
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
      }

      if (fieldId && this.highlightBox()) {
        // Set new timeout to clear highlight
        this.hideTimeout = setTimeout(() => {
          // Parent component should handle clearing activeFieldId
        }, 3000);
      }
    });
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}

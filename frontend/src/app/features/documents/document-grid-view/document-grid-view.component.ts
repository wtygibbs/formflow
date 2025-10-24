import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentCardComponent } from '../document-card/document-card.component';
import { DocumentListItem } from '../../../core/services/document.service';
import { ProcessingProgress } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-document-grid-view',
  standalone: true,
  imports: [CommonModule, DocumentCardComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      @for (doc of documents(); track doc.id) {
        <div (click)="onDocumentClicked(doc.id)" class="cursor-pointer">
          <app-document-card
            [document]="doc"
            [isSelected]="selectedDocuments().has(doc.id)"
            [processingProgress]="getProcessingProgress(doc.id)"
            (selectionToggled)="onSelectionToggled($event)"
            (downloadCsv)="onDownloadCsv($event)"
          />
        </div>
      }
    </div>
  `
})
export class DocumentGridViewComponent {
  // Inputs
  documents = input.required<DocumentListItem[]>();
  selectedDocuments = input.required<Set<string>>();
  processingProgressMap = input<Record<string, ProcessingProgress>>({});

  // Outputs
  selectionToggled = output<string>();
  downloadCsv = output<{ id: string; fileName: string }>();
  documentClicked = output<string>();

  onSelectionToggled(documentId: string) {
    this.selectionToggled.emit(documentId);
  }

  onDownloadCsv(data: { id: string; fileName: string }) {
    this.downloadCsv.emit(data);
  }

  onDocumentClicked(documentId: string) {
    this.documentClicked.emit(documentId);
  }

  getProcessingProgress(documentId: string): ProcessingProgress | null {
    return this.processingProgressMap()[documentId] || null;
  }
}

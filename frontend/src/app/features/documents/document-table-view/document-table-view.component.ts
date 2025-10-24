import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { DocumentListItem } from '../../../core/services/document.service';
import { ProcessingProgress } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-document-table-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports
  ],
  templateUrl: './document-table-view.component.html',
  styleUrls: ['./document-table-view.component.css']
})
export class DocumentTableViewComponent {
  // Inputs
  documents = input.required<DocumentListItem[]>();
  selectedDocuments = input.required<Set<string>>();
  processingProgressMap = input<Record<string, ProcessingProgress>>({});
  selectAllChecked = input<boolean>(false);

  // Outputs
  selectionToggled = output<string>();
  selectAllToggled = output<void>();
  downloadCsv = output<{ id: string; fileName: string }>();
  documentClicked = output<string>();

  onToggleSelection(documentId: string) {
    this.selectionToggled.emit(documentId);
  }

  onToggleSelectAll() {
    this.selectAllToggled.emit();
  }

  onDownloadCsv(id: string, fileName: string) {
    this.downloadCsv.emit({ id, fileName });
  }

  onDocumentClicked(documentId: string) {
    this.documentClicked.emit(documentId);
  }

  getProcessingProgress(documentId: string): ProcessingProgress | null {
    return this.processingProgressMap()[documentId] || null;
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

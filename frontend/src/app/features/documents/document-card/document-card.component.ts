import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { DocumentListItem } from '../../../core/services/document.service';
import { ProcessingProgress } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-document-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmProgressImports
  ],
  templateUrl: './document-card.component.html',
  styleUrls: ['./document-card.component.css']
})
export class DocumentCardComponent {
  // Inputs
  document = input.required<DocumentListItem>();
  isSelected = input<boolean>(false);
  processingProgress = input<ProcessingProgress | null>(null);

  // Outputs
  selectionToggled = output<string>();
  downloadCsv = output<{ id: string; fileName: string }>();

  onToggleSelection() {
    this.selectionToggled.emit(this.document().id);
  }

  onDownloadCsv() {
    const doc = this.document();
    this.downloadCsv.emit({ id: doc.id, fileName: doc.fileName });
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

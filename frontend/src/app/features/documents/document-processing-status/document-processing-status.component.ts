import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { ProcessingProgress } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-document-processing-status',
  standalone: true,
  imports: [
    CommonModule,
    ...HlmCardImports,
    ...HlmAlertImports,
    ...HlmSpinnerImports,
    ...HlmProgressImports
  ],
  template: `
    @if (progress(); as prog) {
      <div hlmCard>
        <div hlmCardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Processing Document...</h3>
            <span class="text-2xl font-bold text-primary">{{ prog.percentComplete }}%</span>
          </div>
          <hlm-progress [value]="prog.percentComplete" class="h-3" />
          <div class="flex justify-between items-center text-sm">
            <span class="text-muted-foreground">{{ prog.currentStep }}</span>
            @if (prog.estimatedSecondsRemaining) {
              <span class="text-muted-foreground">ETA: {{ prog.estimatedSecondsRemaining }}s</span>
            }
          </div>
          @if (prog.processedFields > 0) {
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Extracting fields:</span>
              <span class="font-medium text-foreground">{{ prog.processedFields }} / {{ prog.totalFields }}</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <div hlmAlert class="flex items-center gap-2">
        <hlm-spinner class="size-4" />
        <p hlmAlertDescription>Document is currently being processed. This may take a few minutes...</p>
      </div>
    }
  `
})
export class DocumentProcessingStatusComponent {
  progress = input<ProcessingProgress | null>(null);
}

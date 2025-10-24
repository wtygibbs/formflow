import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

export interface QualityMetrics {
  averageConfidence: number;
  highConfidenceFields: number;
  mediumConfidenceFields: number;
  lowConfidenceFields: number;
  verificationRate: number;
  verifiedFields: number;
}

@Component({
  selector: 'app-quality-metrics-panel',
  standalone: true,
  imports: [CommonModule, ...HlmCardImports],
  templateUrl: './quality-metrics-panel.component.html'
})
export class QualityMetricsPanelComponent {
  metrics = input.required<QualityMetrics>();

  confidenceColorClass = computed(() => {
    const confidence = this.metrics().averageConfidence;
    if (confidence > 80) return 'text-green-600';
    if (confidence > 60) return 'text-yellow-600';
    return 'text-red-600';
  });
}

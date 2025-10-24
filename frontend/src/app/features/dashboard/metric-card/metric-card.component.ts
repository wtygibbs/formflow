import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, ...HlmCardImports],
  template: `
    <div hlmCard>
      <div hlmCardContent class="pt-6">
        <div class="text-sm text-muted-foreground">{{ label() }}</div>
        <div class="text-3xl font-bold mt-2" [class]="valueClass()">
          {{ value() }}
        </div>
        <div class="text-sm mt-2 text-muted-foreground">{{ subtitle() }}</div>
      </div>
    </div>
  `
})
export class MetricCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  subtitle = input.required<string>();
  valueClass = input<string>('text-primary');
}

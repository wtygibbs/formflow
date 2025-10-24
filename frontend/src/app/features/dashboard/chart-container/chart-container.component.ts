import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-chart-container',
  standalone: true,
  imports: [CommonModule, ...HlmCardImports],
  template: `
    <div hlmCard>
      <div hlmCardContent>
        <h2 class="text-xl font-semibold mb-4">{{ title() }}</h2>
        <ng-content />
      </div>
    </div>
  `
})
export class ChartContainerComponent {
  title = input.required<string>();
}

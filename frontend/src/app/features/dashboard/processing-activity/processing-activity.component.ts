import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';

export interface ProcessingActivityData {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

@Component({
  selector: 'app-processing-activity',
  standalone: true,
  imports: [CommonModule, ...HlmCardImports],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div hlmCard>
        <div hlmCardContent class="pt-6">
          <div class="text-sm text-muted-foreground">Today</div>
          <div class="text-2xl font-bold mt-2">{{ data().today }}</div>
        </div>
      </div>
      <div hlmCard>
        <div hlmCardContent class="pt-6">
          <div class="text-sm text-muted-foreground">This Week</div>
          <div class="text-2xl font-bold mt-2">{{ data().thisWeek }}</div>
        </div>
      </div>
      <div hlmCard>
        <div hlmCardContent class="pt-6">
          <div class="text-sm text-muted-foreground">This Month</div>
          <div class="text-2xl font-bold mt-2">{{ data().thisMonth }}</div>
        </div>
      </div>
    </div>
  `
})
export class ProcessingActivityComponent {
  data = input.required<ProcessingActivityData>();
}

import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardService, DashboardMetrics } from '../../core/services/dashboard.service';
import { SignalRService } from '../../core/services/signalr.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { NgApexchartsModule, ChartComponent, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexStroke, ApexLegend, ApexFill, ApexPlotOptions, ApexTooltip } from 'ng-apexcharts';

export type ChartOptions = {
  series: any[];
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  legend?: ApexLegend;
  fill?: ApexFill;
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  colors?: string[];
  tooltip?: ApexTooltip;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgApexchartsModule,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmSpinnerImports,
    ...HlmSkeletonImports
  ],
  template: `
    <div class="space-y-8">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <h1 class="text-3xl font-bold">Analytics Dashboard</h1>
        <a hlmBtn routerLink="/documents">
          Upload Document
        </a>
      </div>

      @if (loading()) {
        <!-- Skeleton Loading State -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (i of [1,2,3,4]; track i) {
            <div hlmCard>
              <div hlmCardContent class="pt-6 space-y-3">
                <hlm-skeleton class="h-4 w-32" />
                <hlm-skeleton class="h-10 w-24" />
                <hlm-skeleton class="h-4 w-40" />
              </div>
            </div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          @for (i of [1,2]; track i) {
            <div hlmCard>
              <div hlmCardContent class="space-y-4">
                <hlm-skeleton class="h-6 w-48" />
                <hlm-skeleton class="h-64 w-full" />
              </div>
            </div>
          }
        </div>
      } @else if (metrics(); as data) {
        <!-- Key Metrics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Total Documents</div>
              <div class="text-3xl font-bold text-primary mt-2">{{ data.documentStats.totalDocuments }}</div>
              <div class="text-sm mt-2 text-muted-foreground">All time</div>
            </div>
          </div>

          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Success Rate</div>
              <div class="text-3xl font-bold mt-2">
                <span [class]="getSuccessRateClass(data.processingStats.successRate)">
                  {{ data.processingStats.successRate }}%
                </span>
              </div>
              <div class="text-sm mt-2 text-muted-foreground">
                {{ data.documentStats.completedDocuments }} completed
              </div>
            </div>
          </div>

          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Avg Processing Time</div>
              <div class="text-3xl font-bold text-primary mt-2">{{ formatTime(data.processingStats.averageProcessingTimeSeconds) }}</div>
              <div class="text-sm mt-2 text-muted-foreground">Per document</div>
            </div>
          </div>

          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Fields Extracted</div>
              <div class="text-3xl font-bold text-primary mt-2">{{ data.processingStats.totalFieldsExtracted.toLocaleString() }}</div>
              <div class="text-sm mt-2 text-muted-foreground">Total fields</div>
            </div>
          </div>
        </div>

        <!-- Processing Activity -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Today</div>
              <div class="text-2xl font-bold mt-2">{{ data.processingStats.documentsProcessedToday }}</div>
            </div>
          </div>
          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">This Week</div>
              <div class="text-2xl font-bold mt-2">{{ data.processingStats.documentsProcessedThisWeek }}</div>
            </div>
          </div>
          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">This Month</div>
              <div class="text-2xl font-bold mt-2">{{ data.processingStats.documentsProcessedThisMonth }}</div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Processing Trends Chart -->
          <div hlmCard>
            <div hlmCardContent>
              <h2 class="text-xl font-semibold mb-4">Processing Trends (30 Days)</h2>
              @if (trendChartOptions(); as options) {
                <apx-chart
                  [series]="options.series"
                  [chart]="options.chart"
                  [xaxis]="options.xaxis!"
                  [dataLabels]="options.dataLabels!"
                  [stroke]="options.stroke!"
                  [legend]="options.legend!"
                  [colors]="options.colors!"
                  [fill]="options.fill!"
                  [tooltip]="options.tooltip!"
                ></apx-chart>
              }
            </div>
          </div>

          <!-- Status Distribution Chart -->
          <div hlmCard>
            <div hlmCardContent>
              <h2 class="text-xl font-semibold mb-4">Document Status Distribution</h2>
              @if (statusChartOptions(); as options) {
                <apx-chart
                  [series]="options.series"
                  [chart]="options.chart"
                  [labels]="options.labels!"
                  [dataLabels]="options.dataLabels!"
                  [colors]="options.colors!"
                  [legend]="options.legend!"
                  [plotOptions]="options.plotOptions!"
                  [tooltip]="options.tooltip!"
                ></apx-chart>
              }
            </div>
          </div>
        </div>

        <!-- Quality Metrics -->
        <div hlmCard>
          <div hlmCardContent>
            <h2 class="text-xl font-semibold mb-4">Quality Metrics</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div class="text-center">
                <div class="text-sm text-muted-foreground mb-2">Avg Confidence</div>
                <div class="text-3xl font-bold" [class]="getConfidenceColorClass(data.qualityMetrics.averageConfidence)">
                  {{ data.qualityMetrics.averageConfidence }}%
                </div>
              </div>
              <div class="text-center">
                <div class="text-sm text-muted-foreground mb-2">High Confidence</div>
                <div class="text-3xl font-bold text-green-600">{{ data.qualityMetrics.highConfidenceFields }}</div>
                <div class="text-xs text-muted-foreground mt-1">&gt;80%</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-muted-foreground mb-2">Medium Confidence</div>
                <div class="text-3xl font-bold text-yellow-600">{{ data.qualityMetrics.mediumConfidenceFields }}</div>
                <div class="text-xs text-muted-foreground mt-1">60-80%</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-muted-foreground mb-2">Low Confidence</div>
                <div class="text-3xl font-bold text-red-600">{{ data.qualityMetrics.lowConfidenceFields }}</div>
                <div class="text-xs text-muted-foreground mt-1">&lt;60%</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-muted-foreground mb-2">Verification Rate</div>
                <div class="text-3xl font-bold text-primary">{{ data.qualityMetrics.verificationRate }}%</div>
                <div class="text-xs text-muted-foreground mt-1">{{ data.qualityMetrics.verifiedFields }} verified</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex gap-4 flex-wrap">
          <a hlmBtn routerLink="/documents">View All Documents</a>
          <a hlmBtn variant="outline" routerLink="/subscription">Manage Subscription</a>
        </div>
      }
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private signalRService = inject(SignalRService);

  metrics = signal<DashboardMetrics | null>(null);
  loading = signal(true);
  trendChartOptions = signal<ChartOptions | null>(null);
  statusChartOptions = signal<ChartOptions | null>(null);

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.loadMetrics();
    this.setupSignalRSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSignalRSubscriptions() {
    const dashboardUpdateSub = this.signalRService.dashboardUpdate$.subscribe(() => {
      this.loadMetrics();
    });

    this.subscriptions.push(dashboardUpdateSub);
  }

  loadMetrics() {
    this.dashboardService.getDashboardMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.initializeCharts(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private initializeCharts(data: DashboardMetrics) {
    // Processing Trends Chart (Area Chart)
    const dates = data.processingTrends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const successful = data.processingTrends.map(t => t.successfulDocuments);
    const failed = data.processingTrends.map(t => t.failedDocuments);

    this.trendChartOptions.set({
      series: [
        { name: 'Successful', data: successful },
        { name: 'Failed', data: failed }
      ],
      chart: {
        type: 'area',
        height: 300,
        toolbar: { show: false },
        background: 'transparent'
      },
      xaxis: {
        categories: dates,
        labels: {
          rotate: -45,
          rotateAlways: false,
          style: { fontSize: '11px' }
        }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      colors: ['#16a34a', '#dc2626'],
      legend: {
        position: 'top',
        horizontalAlign: 'right'
      },
      tooltip: {
        theme: 'dark'
      }
    });

    // Status Distribution Chart (Donut Chart)
    const statusCounts = data.statusBreakdown.map(s => s.count);
    const statusLabels = data.statusBreakdown.map(s => s.status);

    this.statusChartOptions.set({
      series: statusCounts,
      chart: {
        type: 'donut',
        height: 300,
        background: 'transparent'
      },
      labels: statusLabels,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      colors: ['#94a3b8', '#eab308', '#16a34a', '#dc2626'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '16px',
                fontWeight: 600
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => val.toString()
        }
      }
    });
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  getSuccessRateClass(rate: number): string {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }

  getConfidenceColorClass(confidence: number): string {
    if (confidence > 80) return 'text-green-600';
    if (confidence > 60) return 'text-yellow-600';
    return 'text-red-600';
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardService, DashboardMetrics } from '../../core/services/dashboard.service';
import { SignalRService } from '../../core/services/signalr.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { NgApexchartsModule, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexStroke, ApexLegend, ApexFill, ApexPlotOptions, ApexTooltip } from 'ng-apexcharts';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { ProcessingActivityComponent, ProcessingActivityData } from './processing-activity/processing-activity.component';
import { QualityMetricsPanelComponent, QualityMetrics } from './quality-metrics-panel/quality-metrics-panel.component';
import { ChartContainerComponent } from './chart-container/chart-container.component';

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
    MetricCardComponent,
    ProcessingActivityComponent,
    QualityMetricsPanelComponent,
    ChartContainerComponent,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmSkeletonImports
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  private dashboardService = inject(DashboardService);
  private signalRService = inject(SignalRService);

  // State signals
  metrics = signal<DashboardMetrics | null>(null);
  loading = signal(true);
  trendChartOptions = signal<ChartOptions | null>(null);
  statusChartOptions = signal<ChartOptions | null>(null);

  // Track processed dashboard updates to prevent duplicates
  private lastDashboardUpdateTime = 0;

  // SignalR dashboard updates converted to signal
  private dashboardUpdate = toSignal(
    this.signalRService.dashboardUpdate$,
    { initialValue: null }
  );

  // Computed signals for component inputs
  processingActivityData = computed<ProcessingActivityData | null>(() => {
    const data = this.metrics();
    if (!data) return null;
    return {
      today: data.processingStats.documentsProcessedToday,
      thisWeek: data.processingStats.documentsProcessedThisWeek,
      thisMonth: data.processingStats.documentsProcessedThisMonth
    };
  });

  qualityMetrics = computed<QualityMetrics | null>(() => {
    const data = this.metrics();
    if (!data) return null;
    return data.qualityMetrics;
  });

  // Computed helper functions
  successRateClass = computed(() => {
    const data = this.metrics();
    if (!data) return 'text-primary';
    const rate = data.processingStats.successRate;
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  });

  formattedProcessingTime = computed(() => {
    const data = this.metrics();
    if (!data) return '0s';
    return this.formatTime(data.processingStats.averageProcessingTimeSeconds);
  });

  constructor() {
    // Effect to reload metrics when dashboard update event received
    effect(() => {
      const update = this.dashboardUpdate();
      if (update) {
        const updateTime = new Date(update.timestamp).getTime();

        // Debounce: Skip if we received an update in the last 2 seconds
        if (updateTime - this.lastDashboardUpdateTime < 2000) {
          console.log('Dashboard update debounced - skipping');
          return;
        }

        this.lastDashboardUpdateTime = updateTime;
        this.loadMetrics();
      }
    }, { allowSignalWrites: true });

    // Initial load
    this.loadMetrics();
  }

  private loadMetrics() {
    // Prevent loading if already loading
    if (this.loading()) {
      console.log('Dashboard already loading - skipping duplicate request');
      return;
    }

    this.loading.set(true);
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
    const dates = data.processingTrends.map(t =>
      new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
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

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
}

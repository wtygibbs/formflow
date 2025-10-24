import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentStats {
  totalDocuments: number;
  completedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  uploadedDocuments: number;
}

export interface ProcessingStats {
  averageProcessingTimeSeconds: number;
  successRate: number;
  totalFieldsExtracted: number;
  documentsProcessedToday: number;
  documentsProcessedThisWeek: number;
  documentsProcessedThisMonth: number;
}

export interface QualityMetrics {
  averageConfidence: number;
  highConfidenceFields: number;
  mediumConfidenceFields: number;
  lowConfidenceFields: number;
  verifiedFields: number;
  verificationRate: number;
}

export interface ProcessingTrend {
  date: string;
  documentsProcessed: number;
  successfulDocuments: number;
  failedDocuments: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardMetrics {
  documentStats: DocumentStats;
  processingStats: ProcessingStats;
  qualityMetrics: QualityMetrics;
  processingTrends: ProcessingTrend[];
  statusBreakdown: StatusBreakdown[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${environment.apiUrl}/documents/dashboard/metrics`);
  }
}

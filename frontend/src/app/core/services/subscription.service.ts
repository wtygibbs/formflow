import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SubscriptionResponse {
  tier: number;
  status: number;
  documentsProcessedThisMonth: number;
  documentLimit: number;
  expiresAt?: string;
  monthlyPrice?: number;
}

export interface SubscriptionTierInfo {
  tier: number;
  name: string;
  documentLimit: number;
  monthlyPrice: number;
  features: string[];
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  publishableKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private http = inject(HttpClient);

  getSubscription(): Observable<SubscriptionResponse> {
    return this.http.get<SubscriptionResponse>(`${environment.apiUrl}/subscription`);
  }

  getTiers(): Observable<SubscriptionTierInfo[]> {
    return this.http.get<SubscriptionTierInfo[]>(`${environment.apiUrl}/subscription/tiers`);
  }

  createCheckoutSession(tier: number): Observable<CreateCheckoutSessionResponse> {
    return this.http.post<CreateCheckoutSessionResponse>(
      `${environment.apiUrl}/subscription/checkout`,
      { tier }
    );
  }

  cancelSubscription(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/subscription/cancel`, {});
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentService, DocumentListItem } from '../../core/services/document.service';
import { SubscriptionService, SubscriptionResponse } from '../../core/services/subscription.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <h1 class="text-4xl font-bold text-base-content">Dashboard</h1>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @if (subscription(); as sub) {
          <div class="stats shadow bg-base-100">
            <div class="stat">
              <div class="stat-title">Documents This Month</div>
              <div class="stat-value text-primary">{{ sub.documentsProcessedThisMonth }} / {{ sub.documentLimit }}</div>
              <div class="stat-desc">
                @if (sub.documentsProcessedThisMonth >= sub.documentLimit) {
                  <span class="text-error">Limit reached</span>
                } @else {
                  <span class="text-success">{{ sub.documentLimit - sub.documentsProcessedThisMonth }} remaining</span>
                }
              </div>
            </div>
          </div>

          <div class="stats shadow bg-base-100">
            <div class="stat">
              <div class="stat-title">Subscription Tier</div>
              <div class="stat-value text-secondary">{{ getTierName(sub.tier) }}</div>
              <div class="stat-desc">Current plan</div>
            </div>
          </div>

          <div class="stats shadow bg-base-100">
            <div class="stat">
              <div class="stat-title">Total Documents</div>
              <div class="stat-value text-accent">{{ recentDocuments().length }}</div>
              <div class="stat-desc">All time</div>
            </div>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex gap-4 flex-wrap">
        <a routerLink="/documents" class="btn btn-primary btn-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload New Document
        </a>
        <a routerLink="/subscription" class="btn btn-outline btn-lg">Manage Subscription</a>
      </div>

      <!-- Recent Documents -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Recent Documents</h2>
          @if (loading()) {
            <div class="flex justify-center p-8">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          } @else if (recentDocuments().length === 0) {
            <div class="text-center py-12">
              <div class="text-6xl mb-4">📄</div>
              <p class="text-base-content/60">No documents yet. Upload your first ACORD 125 form to get started!</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (doc of recentDocuments(); track doc.id) {
                    <tr class="hover">
                      <td class="font-semibold">{{ doc.fileName }}</td>
                      <td>{{ formatDate(doc.uploadedAt) }}</td>
                      <td>
                        @switch (doc.status) {
                          @case (0) {
                            <div class="badge badge-neutral">Uploaded</div>
                          }
                          @case (1) {
                            <div class="badge badge-warning">Processing</div>
                          }
                          @case (2) {
                            <div class="badge badge-success">Completed</div>
                          }
                          @case (3) {
                            <div class="badge badge-error">Failed</div>
                          }
                        }
                      </td>
                      <td>
                        <a [routerLink]="['/documents', doc.id]" class="btn btn-sm btn-primary">View Details</a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  private documentService = inject(DocumentService);
  private subscriptionService = inject(SubscriptionService);

  recentDocuments = signal<DocumentListItem[]>([]);
  subscription = signal<SubscriptionResponse | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.documentService.getDocuments().subscribe({
      next: (docs) => {
        this.recentDocuments.set(docs.slice(0, 5));
        this.loading.set(false);
      }
    });

    this.subscriptionService.getSubscription().subscribe({
      next: (sub) => this.subscription.set(sub)
    });
  }

  getTierName(tier: number): string {
    const tiers = ['Free', 'Starter', 'Growth', 'Pro'];
    return tiers[tier] || 'Unknown';
  }

  getStatusText(status: number): string {
    const statuses = ['Uploaded', 'Processing', 'Completed', 'Failed'];
    return statuses[status] || 'Unknown';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

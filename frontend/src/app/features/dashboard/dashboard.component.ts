import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentListItem, DocumentService } from '../../core/services/document.service';
import { SubscriptionResponse, SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <h1 class="text-3xl font-bold">Dashboard</h1>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @if (subscription(); as sub) {
          <div class="stats border border-base-300 shadow-sm bg-base-100">
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

          <div class="stats border border-base-300 shadow-sm bg-base-100">
            <div class="stat">
              <div class="stat-title">Subscription Tier</div>
              <div class="stat-value">{{ getTierName(sub.tier) }}</div>
              <div class="stat-desc">Current plan</div>
            </div>
          </div>

          <div class="stats border border-base-300 shadow-sm bg-base-100">
            <div class="stat">
              <div class="stat-title">Total Documents</div>
              <div class="stat-value">{{ recentDocuments().length }}</div>
              <div class="stat-desc">All time</div>
            </div>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex gap-4 flex-wrap">
        <a routerLink="/documents" class="btn btn-primary">
          Upload New Document
        </a>
        <a routerLink="/subscription" class="btn btn-outline">Manage Subscription</a>
      </div>

      <!-- Recent Documents -->
      <div class="card bg-base-100 border border-base-300 shadow-sm">
        <div class="card-body">
          <h2 class="text-xl font-semibold mb-4">Recent Documents</h2>
          @if (loading()) {
            <div class="flex justify-center p-8">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          } @else if (recentDocuments().length === 0) {
            <div class="text-center py-12">
              <p class="text-base-content/70">No documents yet. Upload your first ACORD 125 form to get started!</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="table">
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
                      <td class="font-medium">{{ doc.fileName }}</td>
                      <td class="text-sm">{{ formatDate(doc.uploadedAt) }}</td>
                      <td>
                        @switch (doc.status) {
                          @case (0) {
                            <div class="badge badge-neutral badge-sm">Uploaded</div>
                          }
                          @case (1) {
                            <div class="badge badge-warning badge-sm">Processing</div>
                          }
                          @case (2) {
                            <div class="badge badge-success badge-sm">Completed</div>
                          }
                          @case (3) {
                            <div class="badge badge-error badge-sm">Failed</div>
                          }
                        }
                      </td>
                      <td>
                        <a [routerLink]="['/documents', doc.id]" class="btn btn-sm btn-primary">View</a>
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

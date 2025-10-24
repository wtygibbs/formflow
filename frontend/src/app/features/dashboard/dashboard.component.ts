import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentListItem, DocumentService } from '../../core/services/document.service';
import { SubscriptionResponse, SubscriptionService } from '../../core/services/subscription.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmTableImports,
    ...HlmSpinnerImports
  ],
  template: `
    <div class="space-y-8">
      <h1 class="text-3xl font-bold">Dashboard</h1>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @if (subscription(); as sub) {
          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Documents This Month</div>
              <div class="text-3xl font-bold text-primary mt-2">{{ sub.documentsProcessedThisMonth }} / {{ sub.documentLimit }}</div>
              <div class="text-sm mt-2">
                @if (sub.documentsProcessedThisMonth >= sub.documentLimit) {
                  <span class="text-destructive">Limit reached</span>
                } @else {
                  <span class="text-green-600">{{ sub.documentLimit - sub.documentsProcessedThisMonth }} remaining</span>
                }
              </div>
            </div>
          </div>

          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Subscription Tier</div>
              <div class="text-3xl font-bold mt-2">{{ getTierName(sub.tier) }}</div>
              <div class="text-sm text-muted-foreground mt-2">Current plan</div>
            </div>
          </div>

          <div hlmCard>
            <div hlmCardContent class="pt-6">
              <div class="text-sm text-muted-foreground">Total Documents</div>
              <div class="text-3xl font-bold mt-2">{{ recentDocuments().length }}</div>
              <div class="text-sm text-muted-foreground mt-2">All time</div>
            </div>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex gap-4 flex-wrap">
        <a hlmBtn routerLink="/documents">
          Upload New Document
        </a>
        <a hlmBtn variant="outline" routerLink="/subscription">Manage Subscription</a>
      </div>

      <!-- Recent Documents -->
      <div hlmCard>
        <div hlmCardContent>
          <h2 class="text-xl font-semibold mb-4">Recent Documents</h2>
          @if (loading()) {
            <div class="flex justify-center p-8">
              <hlm-spinner />
            </div>
          } @else if (recentDocuments().length === 0) {
            <div class="text-center py-12">
              <p class="text-muted-foreground">No documents yet. Upload your first ACORD 125 form to get started!</p>
            </div>
          } @else {
            <div hlmTableContainer>
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh>File Name</th>
                    <th hlmTh>Uploaded</th>
                    <th hlmTh>Status</th>
                    <th hlmTh>Actions</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (doc of recentDocuments(); track doc.id) {
                    <tr hlmTr>
                      <td hlmTd class="font-medium">{{ doc.fileName }}</td>
                      <td hlmTd class="text-sm">{{ formatDate(doc.uploadedAt) }}</td>
                      <td hlmTd>
                        @switch (doc.status) {
                          @case (0) {
                            <span hlmBadge variant="secondary">Uploaded</span>
                          }
                          @case (1) {
                            <span hlmBadge variant="outline" class="border-yellow-500 text-yellow-600">Processing</span>
                          }
                          @case (2) {
                            <span hlmBadge class="bg-green-600 text-white">Completed</span>
                          }
                          @case (3) {
                            <span hlmBadge variant="destructive">Failed</span>
                          }
                        }
                      </td>
                      <td hlmTd>
                        <a hlmBtn size="sm" [routerLink]="['/documents', doc.id]">View</a>
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

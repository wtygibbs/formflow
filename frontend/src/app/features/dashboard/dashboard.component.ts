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
    <div class="dashboard">
      <h1>Dashboard</h1>

      <div class="stats-grid">
        @if (subscription(); as sub) {
          <div class="stat-card">
            <h3>Documents This Month</h3>
            <p class="stat-value">{{ sub.documentsProcessedThisMonth }} / {{ sub.documentLimit }}</p>
          </div>

          <div class="stat-card">
            <h3>Subscription Tier</h3>
            <p class="stat-value">{{ getTierName(sub.tier) }}</p>
          </div>

          <div class="stat-card">
            <h3>Total Documents</h3>
            <p class="stat-value">{{ recentDocuments().length }}</p>
          </div>
        }
      </div>

      <div class="actions">
        <a routerLink="/documents" class="btn btn-primary">Upload New Document</a>
        <a routerLink="/subscription" class="btn btn-outline">Manage Subscription</a>
      </div>

      <div class="recent-documents">
        <h2>Recent Documents</h2>
        @if (loading()) {
          <p>Loading documents...</p>
        } @else if (recentDocuments().length === 0) {
          <p class="empty-state">No documents yet. Upload your first ACORD 125 form to get started!</p>
        } @else {
          <div class="document-list">
            @for (doc of recentDocuments(); track doc.id) {
              <div class="document-item">
                <div class="document-info">
                  <h4>{{ doc.fileName }}</h4>
                  <p class="document-meta">
                    Uploaded: {{ formatDate(doc.uploadedAt) }} •
                    Status: <span [class]="'status-' + doc.status">{{ getStatusText(doc.status) }}</span>
                  </p>
                </div>
                <a [routerLink]="['/documents', doc.id]" class="btn btn-sm">View Details</a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 2rem 0;
      color: #333;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-card h3 {
      margin: 0 0 1rem 0;
      color: #6c757d;
      font-size: 0.875rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
    }

    .actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 3rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
      display: inline-block;
      cursor: pointer;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-outline {
      background: white;
      color: #667eea;
      border-color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .recent-documents {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .recent-documents h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
    }

    .empty-state {
      text-align: center;
      color: #6c757d;
      padding: 2rem;
    }

    .document-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .document-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      transition: all 0.3s;
    }

    .document-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }

    .document-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .document-meta {
      margin: 0;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .status-0 { color: #6c757d; }
    .status-1 { color: #ffc107; }
    .status-2 { color: #28a745; }
    .status-3 { color: #dc3545; }
  `]
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

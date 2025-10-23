import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionService, SubscriptionResponse, SubscriptionTierInfo } from '../../core/services/subscription.service';
import { loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="subscription-container">
      <h1>Subscription Management</h1>

      @if (currentSubscription(); as sub) {
        <div class="current-subscription">
          <h2>Current Plan</h2>
          <div class="subscription-card">
            <div class="subscription-header">
              <h3>{{ getTierName(sub.tier) }}</h3>
              <span class="status-badge" [class]="'status-' + sub.status">{{ getStatusText(sub.status) }}</span>
            </div>
            <div class="subscription-stats">
              <div class="stat">
                <span class="stat-label">Documents Used</span>
                <span class="stat-value">{{ sub.documentsProcessedThisMonth }} / {{ sub.documentLimit }}</span>
              </div>
              @if (sub.monthlyPrice) {
                <div class="stat">
                  <span class="stat-label">Monthly Price</span>
                  <span class="stat-value">\${{ sub.monthlyPrice }}</span>
                </div>
              }
              @if (sub.expiresAt) {
                <div class="stat">
                  <span class="stat-label">Renews On</span>
                  <span class="stat-value">{{ formatDate(sub.expiresAt) }}</span>
                </div>
              }
            </div>
            @if (sub.tier !== 0 && sub.status === 0) {
              <button (click)="cancelSubscription()" class="btn btn-outline btn-danger">
                Cancel Subscription
              </button>
            }
          </div>
        </div>
      }

      <div class="available-plans">
        <h2>Available Plans</h2>
        @if (loading()) {
          <p>Loading plans...</p>
        } @else {
          <div class="plans-grid">
            @for (tier of availableTiers(); track tier.tier) {
              <div class="plan-card" [class.current]="isCurrentTier(tier.tier)">
                @if (isCurrentTier(tier.tier)) {
                  <div class="current-badge">Current Plan</div>
                }
                <h3>{{ tier.name }}</h3>
                <p class="price">
                  @if (tier.monthlyPrice === 0) {
                    <span class="amount">Free</span>
                  } @else {
                    <span class="currency">$</span>
                    <span class="amount">{{ tier.monthlyPrice }}</span>
                    <span class="period">/month</span>
                  }
                </p>
                <ul class="features">
                  @for (feature of tier.features; track feature) {
                    <li>{{ feature }}</li>
                  }
                </ul>
                @if (!isCurrentTier(tier.tier)) {
                  @if (tier.tier === 0) {
                    <button class="btn btn-outline" disabled>Downgrade to Free</button>
                  } @else {
                    <button (click)="upgrade(tier.tier)" class="btn btn-primary" [disabled]="upgrading()">
                      {{ upgrading() ? 'Processing...' : 'Upgrade to ' + tier.name }}
                    </button>
                  }
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .subscription-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 2rem 0;
      color: #333;
    }

    h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
    }

    .current-subscription {
      margin-bottom: 3rem;
    }

    .subscription-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .subscription-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .subscription-header h3 {
      margin: 0;
      color: #667eea;
      font-size: 1.5rem;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-0 { background: #d4edda; color: #155724; }
    .status-1 { background: #f8d7da; color: #721c24; }
    .status-2 { background: #fff3cd; color: #856404; }
    .status-3 { background: #e0e0e0; color: #666; }

    .subscription-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-label {
      color: #6c757d;
      font-size: 0.875rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      color: #333;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .available-plans {
      margin-bottom: 3rem;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }

    .plan-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
      transition: all 0.3s;
    }

    .plan-card:hover:not(.current) {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .plan-card.current {
      border: 2px solid #667eea;
    }

    .current-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 0.25rem 1rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .plan-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.5rem;
    }

    .price {
      margin: 0 0 2rem 0;
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
    }

    .currency {
      font-size: 1.5rem;
      color: #667eea;
      font-weight: 700;
    }

    .amount {
      font-size: 3rem;
      color: #667eea;
      font-weight: 700;
      line-height: 1;
    }

    .period {
      color: #6c757d;
      font-size: 1rem;
    }

    .features {
      list-style: none;
      padding: 0;
      margin: 0 0 2rem 0;
    }

    .features li {
      padding: 0.75rem 0;
      border-bottom: 1px solid #e0e0e0;
      color: #333;
    }

    .features li:last-child {
      border-bottom: none;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
      cursor: pointer;
      font-size: 1rem;
      width: 100%;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-outline {
      background: white;
      color: #667eea;
      border-color: #667eea;
    }

    .btn-outline:hover:not(:disabled) {
      background: #667eea;
      color: white;
    }

    .btn-danger {
      color: #dc3545;
      border-color: #dc3545;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc3545;
      color: white;
    }
  `]
})
export class SubscriptionComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  currentSubscription = signal<SubscriptionResponse | null>(null);
  availableTiers = signal<SubscriptionTierInfo[]>([]);
  loading = signal(true);
  upgrading = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.subscriptionService.getSubscription().subscribe({
      next: (sub) => this.currentSubscription.set(sub)
    });

    this.subscriptionService.getTiers().subscribe({
      next: (tiers) => {
        this.availableTiers.set(tiers);
        this.loading.set(false);
      }
    });
  }

  async upgrade(tier: number) {
    this.upgrading.set(true);

    try {
      const response = await this.subscriptionService.createCheckoutSession(tier).toPromise();
      if (response) {
        const stripe = await loadStripe(environment.stripePublishableKey);
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: response.sessionId });
        }
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      this.upgrading.set(false);
    }
  }

  cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      this.subscriptionService.cancelSubscription().subscribe({
        next: () => {
          alert('Subscription cancelled successfully');
          this.loadData();
        },
        error: () => {
          alert('Failed to cancel subscription. Please try again.');
        }
      });
    }
  }

  isCurrentTier(tier: number): boolean {
    return this.currentSubscription()?.tier === tier;
  }

  getTierName(tier: number): string {
    const tiers = ['Free', 'Starter', 'Growth', 'Pro'];
    return tiers[tier] || 'Unknown';
  }

  getStatusText(status: number): string {
    const statuses = ['Active', 'Cancelled', 'Past Due', 'Expired'];
    return statuses[status] || 'Unknown';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}

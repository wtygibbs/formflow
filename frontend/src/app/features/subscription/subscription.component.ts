import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionService, SubscriptionResponse, SubscriptionTierInfo } from '../../core/services/subscription.service';
import { loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <h1 class="text-4xl font-bold text-base-content">Subscription Management</h1>

      <!-- Current Plan -->
      @if (currentSubscription(); as sub) {
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="flex justify-between items-center mb-6">
              <h2 class="card-title text-2xl">Current Plan</h2>
              @switch (sub.status) {
                @case (0) {
                  <div class="badge badge-success badge-lg">Active</div>
                }
                @case (1) {
                  <div class="badge badge-error badge-lg">Cancelled</div>
                }
                @case (2) {
                  <div class="badge badge-warning badge-lg">Past Due</div>
                }
                @case (3) {
                  <div class="badge badge-neutral badge-lg">Expired</div>
                }
              }
            </div>

            <div class="stats shadow bg-base-200 mb-6">
              <div class="stat">
                <div class="stat-title">Plan</div>
                <div class="stat-value text-primary">{{ getTierName(sub.tier) }}</div>
              </div>
              <div class="stat">
                <div class="stat-title">Documents Used</div>
                <div class="stat-value text-secondary">{{ sub.documentsProcessedThisMonth }} / {{ sub.documentLimit }}</div>
              </div>
              @if (sub.monthlyPrice) {
                <div class="stat">
                  <div class="stat-title">Monthly Price</div>
                  <div class="stat-value text-accent">\${{ sub.monthlyPrice }}</div>
                </div>
              }
            </div>

            @if (sub.expiresAt) {
              <div class="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Renews on {{ formatDate(sub.expiresAt) }}</span>
              </div>
            }

            @if (sub.tier !== 0 && sub.status === 0) {
              <button (click)="cancelSubscription()" class="btn btn-error btn-outline">
                Cancel Subscription
              </button>
            }
          </div>
        </div>
      }

      <!-- Available Plans -->
      <div>
        <h2 class="text-3xl font-bold text-base-content mb-6">Available Plans</h2>
        @if (loading()) {
          <div class="flex justify-center p-16">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (tier of availableTiers(); track tier.tier) {
              <div class="card bg-base-100 shadow-xl"
                   [class.border-2]="isCurrentTier(tier.tier)"
                   [class.border-primary]="isCurrentTier(tier.tier)"
                   [class.scale-105]="tier.tier === 1">
                <div class="card-body">
                  @if (isCurrentTier(tier.tier)) {
                    <div class="badge badge-primary absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</div>
                  }
                  @if (tier.tier === 1 && !isCurrentTier(tier.tier)) {
                    <div class="badge badge-secondary absolute -top-3 left-1/2 -translate-x-1/2">Popular</div>
                  }

                  <h3 class="card-title text-2xl justify-center mt-2">{{ tier.name }}</h3>

                  <div class="text-center my-6">
                    @if (tier.monthlyPrice === 0) {
                      <div class="text-5xl font-bold text-primary">Free</div>
                    } @else {
                      <div class="flex items-baseline justify-center">
                        <span class="text-2xl text-primary font-bold">$</span>
                        <span class="text-5xl font-bold text-primary">{{ tier.monthlyPrice }}</span>
                        <span class="text-base-content/60 ml-2">/month</span>
                      </div>
                    }
                  </div>

                  <ul class="space-y-3 mb-6">
                    @for (feature of tier.features; track feature) {
                      <li class="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        <span class="text-sm">{{ feature }}</span>
                      </li>
                    }
                  </ul>

                  @if (!isCurrentTier(tier.tier)) {
                    @if (tier.tier === 0) {
                      <button class="btn btn-outline w-full" disabled>Downgrade to Free</button>
                    } @else {
                      <button (click)="upgrade(tier.tier)" class="btn btn-primary w-full" [disabled]="upgrading()">
                        @if (upgrading()) {
                          <span class="loading loading-spinner"></span>
                          Processing...
                        } @else {
                          Upgrade to {{ tier.name }}
                        }
                      </button>
                    }
                  } @else {
                    <button class="btn btn-primary w-full" disabled>Current Plan</button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: []
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

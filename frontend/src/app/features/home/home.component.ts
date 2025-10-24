import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ...HlmCardImports, ...HlmButtonImports, ...HlmBadgeImports],
  template: `
    <div class="space-y-20 py-12">
      <!-- Hero Section -->
      <section class="text-center max-w-4xl mx-auto">
        <h1 class="text-5xl font-bold tracking-tight">
          ACORD 125 Form Parser
        </h1>
        <p class="mt-6 text-lg text-muted-foreground">
          Automate insurance form data extraction with AI-powered accuracy. Upload, extract, review, and export in minutes.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <a hlmBtn routerLink="/register">Get Started Free</a>
          <a hlmBtn variant="outline" routerLink="/login">Sign In</a>
        </div>
      </section>

      <!-- Features Section -->
      <section class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div hlmCard class="hover:shadow-md transition-shadow">
            <div hlmCardContent class="flex flex-col items-center text-center pt-6">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted border">
                <span class="text-lg font-semibold">1</span>
              </div>
              <h3 hlmCardTitle class="text-base mt-4">Upload Document</h3>
              <p class="text-sm text-muted-foreground">
                Upload your ACORD 125 form in PDF or image format
              </p>
            </div>
          </div>
          <div hlmCard class="hover:shadow-md transition-shadow">
            <div hlmCardContent class="flex flex-col items-center text-center pt-6">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted border">
                <span class="text-lg font-semibold">2</span>
              </div>
              <h3 hlmCardTitle class="text-base mt-4">AI Extraction</h3>
              <p class="text-sm text-muted-foreground">
                Azure AI automatically extracts all key data fields
              </p>
            </div>
          </div>
          <div hlmCard class="hover:shadow-md transition-shadow">
            <div hlmCardContent class="flex flex-col items-center text-center pt-6">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted border">
                <span class="text-lg font-semibold">3</span>
              </div>
              <h3 hlmCardTitle class="text-base mt-4">Review & Edit</h3>
              <p class="text-sm text-muted-foreground">
                Verify and edit extracted data with confidence scores
              </p>
            </div>
          </div>
          <div hlmCard class="hover:shadow-md transition-shadow">
            <div hlmCardContent class="flex flex-col items-center text-center pt-6">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted border">
                <span class="text-lg font-semibold">4</span>
              </div>
              <h3 hlmCardTitle class="text-base mt-4">Export CSV</h3>
              <p class="text-sm text-muted-foreground">
                Download your data in CSV format for easy integration
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Free Tier -->
          <div hlmCard>
            <div hlmCardContent>
              <h3 hlmCardTitle>Free</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$0</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> 25 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> Basic AI extraction
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> CSV export
                </li>
              </ul>
              <a hlmBtn variant="outline" class="w-full" routerLink="/register">Start Free</a>
            </div>
          </div>

          <!-- Starter Tier (Featured) -->
          <div hlmCard class="relative border-2 border-primary shadow-lg">
            <span hlmBadge class="absolute -top-3 left-1/2 -translate-x-1/2">Popular</span>
            <div hlmCardContent>
              <h3 hlmCardTitle>Starter</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$29</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> 100 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> Advanced AI extraction
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> Priority support
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> 2FA security
                </li>
              </ul>
              <a hlmBtn class="w-full" routerLink="/register">Get Started</a>
            </div>
          </div>

          <!-- Growth Tier -->
          <div hlmCard>
            <div hlmCardContent>
              <h3 hlmCardTitle>Growth</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$99</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> 500 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> API access
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> Priority support
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span> All features
                </li>
              </ul>
              <a hlmBtn variant="outline" class="w-full" routerLink="/register">Get Started</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: []
})
export class HomeComponent {}

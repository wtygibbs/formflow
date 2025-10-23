import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-20 py-12">
      <!-- Hero Section -->
      <section class="text-center max-w-4xl mx-auto">
        <h1 class="text-5xl font-bold tracking-tight">
          ACORD 125 Form Parser
        </h1>
        <p class="mt-6 text-lg text-base-content/70">
          Automate insurance form data extraction with AI-powered accuracy. Upload, extract, review, and export in minutes.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <a routerLink="/register" class="btn btn-primary">Get Started Free</a>
          <a routerLink="/login" class="btn btn-outline">Sign In</a>
        </div>
      </section>

      <!-- Features Section -->
      <section class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200 border border-base-300">
                <span class="text-lg font-semibold">1</span>
              </div>
              <h3 class="card-title text-base">Upload Document</h3>
              <p class="text-sm text-base-content/70">
                Upload your ACORD 125 form in PDF or image format
              </p>
            </div>
          </div>
          <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200 border border-base-300">
                <span class="text-lg font-semibold">2</span>
              </div>
              <h3 class="card-title text-base">AI Extraction</h3>
              <p class="text-sm text-base-content/70">
                Azure AI automatically extracts all key data fields
              </p>
            </div>
          </div>
          <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200 border border-base-300">
                <span class="text-lg font-semibold">3</span>
              </div>
              <h3 class="card-title text-base">Review & Edit</h3>
              <p class="text-sm text-base-content/70">
                Verify and edit extracted data with confidence scores
              </p>
            </div>
          </div>
          <div class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-base-200 border border-base-300">
                <span class="text-lg font-semibold">4</span>
              </div>
              <h3 class="card-title text-base">Export CSV</h3>
              <p class="text-sm text-base-content/70">
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
          <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body">
              <h3 class="card-title">Free</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$0</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> 25 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> Basic AI extraction
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> CSV export
                </li>
              </ul>
              <a routerLink="/register" class="btn btn-outline w-full">Start Free</a>
            </div>
          </div>

          <!-- Starter Tier (Featured) -->
          <div class="card bg-base-100 border-2 border-primary shadow-lg">
            <div class="badge badge-primary absolute -top-3 left-1/2 -translate-x-1/2">Popular</div>
            <div class="card-body">
              <h3 class="card-title">Starter</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$29</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> 100 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> Advanced AI extraction
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> Priority support
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> 2FA security
                </li>
              </ul>
              <a routerLink="/register" class="btn btn-primary w-full">Get Started</a>
            </div>
          </div>

          <!-- Growth Tier -->
          <div class="card bg-base-100 border border-base-300 shadow-sm">
            <div class="card-body">
              <h3 class="card-title">Growth</h3>
              <div class="my-4">
                <span class="text-5xl font-bold">$99</span>
                <span class="text-sm">/month</span>
              </div>
              <ul class="space-y-2 text-sm mb-6">
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> 500 documents/month
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> API access
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> Priority support
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✓</span> All features
                </li>
              </ul>
              <a routerLink="/register" class="btn btn-outline w-full">Get Started</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: []
})
export class HomeComponent {}

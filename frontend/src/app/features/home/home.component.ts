import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-16 py-8">
      <!-- Hero Section -->
      <section class="hero bg-gradient-to-r from-primary to-secondary text-primary-content rounded-3xl shadow-2xl">
        <div class="hero-content text-center py-16 px-6">
          <div class="max-w-3xl">
            <h1 class="text-5xl font-bold mb-6">ACORD 125 Form Parser</h1>
            <p class="text-xl mb-8 opacity-90">
              Automate insurance form data extraction with AI-powered accuracy
            </p>
            <div class="flex gap-4 justify-center flex-wrap">
              <a routerLink="/register" class="btn btn-lg btn-primary bg-white text-primary hover:bg-base-100">
                Get Started Free
              </a>
              <a routerLink="/login" class="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-primary">
                Sign In
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="space-y-8">
        <h2 class="text-4xl font-bold text-center">How It Works</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body items-center text-center">
              <div class="text-5xl mb-4">📄</div>
              <h3 class="card-title">1. Upload Document</h3>
              <p>Upload your ACORD 125 form in PDF or image format</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body items-center text-center">
              <div class="text-5xl mb-4">🤖</div>
              <h3 class="card-title">2. AI Extraction</h3>
              <p>Azure AI automatically extracts all key data fields</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body items-center text-center">
              <div class="text-5xl mb-4">✏️</div>
              <h3 class="card-title">3. Review & Edit</h3>
              <p>Verify and edit extracted data with confidence scores</p>
            </div>
          </div>
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body items-center text-center">
              <div class="text-5xl mb-4">💾</div>
              <h3 class="card-title">4. Export CSV</h3>
              <p>Download your data in CSV format for easy integration</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section class="space-y-8">
        <h2 class="text-4xl font-bold text-center">Simple Pricing</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <!-- Free Tier -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center">
              <h3 class="card-title text-2xl">Free</h3>
              <div class="text-4xl font-bold text-primary my-4">
                $0<span class="text-base text-base-content/60">/month</span>
              </div>
              <ul class="space-y-2 mb-6">
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
              <a routerLink="/register" class="btn btn-outline btn-primary">Start Free</a>
            </div>
          </div>

          <!-- Starter Tier (Featured) -->
          <div class="card bg-base-100 shadow-2xl border-2 border-primary scale-105">
            <div class="badge badge-primary absolute top-4 right-4">Popular</div>
            <div class="card-body items-center text-center">
              <h3 class="card-title text-2xl">Starter</h3>
              <div class="text-4xl font-bold text-primary my-4">
                $29<span class="text-base text-base-content/60">/month</span>
              </div>
              <ul class="space-y-2 mb-6">
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
              <a routerLink="/register" class="btn btn-primary">Get Started</a>
            </div>
          </div>

          <!-- Growth Tier -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body items-center text-center">
              <h3 class="card-title text-2xl">Growth</h3>
              <div class="text-4xl font-bold text-primary my-4">
                $99<span class="text-base text-base-content/60">/month</span>
              </div>
              <ul class="space-y-2 mb-6">
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
              <a routerLink="/register" class="btn btn-outline btn-primary">Get Started</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: []
})
export class HomeComponent {}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-24 py-12">
      <!-- Hero Section -->
      <section class="mx-auto max-w-5xl text-center">
        <h1 class="text-5xl font-bold tracking-tight sm:text-6xl">
          ACORD 125 Form Parser
        </h1>
        <p class="mt-6 text-lg leading-8 text-muted-foreground">
          Automate insurance form data extraction with AI-powered accuracy. Upload, extract, review, and export in minutes.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <a routerLink="/register" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
            Get Started Free
          </a>
          <a routerLink="/login" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8">
            Sign In
          </a>
        </div>
      </section>

      <!-- Features Section -->
      <section class="mx-auto max-w-5xl">
        <h2 class="text-3xl font-bold tracking-tight text-center mb-12">How It Works</h2>
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div class="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
            <div class="flex flex-col items-center text-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <span class="text-xl font-semibold">1</span>
              </div>
              <h3 class="font-semibold">Upload Document</h3>
              <p class="text-sm text-muted-foreground">
                Upload your ACORD 125 form in PDF or image format
              </p>
            </div>
          </div>
          <div class="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
            <div class="flex flex-col items-center text-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <span class="text-xl font-semibold">2</span>
              </div>
              <h3 class="font-semibold">AI Extraction</h3>
              <p class="text-sm text-muted-foreground">
                Azure AI automatically extracts all key data fields
              </p>
            </div>
          </div>
          <div class="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
            <div class="flex flex-col items-center text-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <span class="text-xl font-semibold">3</span>
              </div>
              <h3 class="font-semibold">Review & Edit</h3>
              <p class="text-sm text-muted-foreground">
                Verify and edit extracted data with confidence scores
              </p>
            </div>
          </div>
          <div class="relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
            <div class="flex flex-col items-center text-center space-y-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <span class="text-xl font-semibold">4</span>
              </div>
              <h3 class="font-semibold">Export CSV</h3>
              <p class="text-sm text-muted-foreground">
                Download your data in CSV format for easy integration
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section class="mx-auto max-w-5xl">
        <h2 class="text-3xl font-bold tracking-tight text-center mb-12">Simple Pricing</h2>
        <div class="grid gap-8 md:grid-cols-3">
          <!-- Free Tier -->
          <div class="relative flex flex-col rounded-lg border border-border bg-card p-8">
            <div class="flex-1">
              <h3 class="text-2xl font-semibold">Free</h3>
              <div class="mt-4 flex items-baseline">
                <span class="text-5xl font-bold tracking-tight">$0</span>
                <span class="ml-1 text-sm font-semibold text-muted-foreground">/month</span>
              </div>
              <ul class="mt-8 space-y-3 text-sm">
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  25 documents/month
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  Basic AI extraction
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  CSV export
                </li>
              </ul>
            </div>
            <a routerLink="/register" class="mt-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4">
              Start Free
            </a>
          </div>

          <!-- Starter Tier (Featured) -->
          <div class="relative flex flex-col rounded-lg border-2 border-primary bg-card p-8 shadow-lg">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Popular
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-semibold">Starter</h3>
              <div class="mt-4 flex items-baseline">
                <span class="text-5xl font-bold tracking-tight">$29</span>
                <span class="ml-1 text-sm font-semibold text-muted-foreground">/month</span>
              </div>
              <ul class="mt-8 space-y-3 text-sm">
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  100 documents/month
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  Advanced AI extraction
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  Priority support
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  2FA security
                </li>
              </ul>
            </div>
            <a routerLink="/register" class="mt-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4">
              Get Started
            </a>
          </div>

          <!-- Growth Tier -->
          <div class="relative flex flex-col rounded-lg border border-border bg-card p-8">
            <div class="flex-1">
              <h3 class="text-2xl font-semibold">Growth</h3>
              <div class="mt-4 flex items-baseline">
                <span class="text-5xl font-bold tracking-tight">$99</span>
                <span class="ml-1 text-sm font-semibold text-muted-foreground">/month</span>
              </div>
              <ul class="mt-8 space-y-3 text-sm">
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  500 documents/month
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  API access
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  Priority support
                </li>
                <li class="flex gap-3">
                  <svg class="h-5 w-5 flex-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                  All features
                </li>
              </ul>
            </div>
            <a routerLink="/register" class="mt-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4">
              Get Started
            </a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: []
})
export class HomeComponent {}

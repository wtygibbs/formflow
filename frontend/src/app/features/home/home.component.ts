import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="home-container">
      <section class="hero">
        <h1 class="hero-title">ACORD 125 Form Parser</h1>
        <p class="hero-subtitle">
          Automate insurance form data extraction with AI-powered accuracy
        </p>
        <div class="hero-buttons">
          <a routerLink="/register" class="btn btn-primary">Get Started Free</a>
          <a routerLink="/login" class="btn btn-secondary">Sign In</a>
        </div>
      </section>

      <section class="features">
        <h2>How It Works</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">📄</div>
            <h3>1. Upload Document</h3>
            <p>Upload your ACORD 125 form in PDF or image format</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🤖</div>
            <h3>2. AI Extraction</h3>
            <p>Azure AI automatically extracts all key data fields</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">✏️</div>
            <h3>3. Review & Edit</h3>
            <p>Verify and edit extracted data with confidence scores</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💾</div>
            <h3>4. Export CSV</h3>
            <p>Download your data in CSV format for easy integration</p>
          </div>
        </div>
      </section>

      <section class="pricing">
        <h2>Simple Pricing</h2>
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3>Free</h3>
            <p class="price">$0<span>/month</span></p>
            <ul>
              <li>25 documents/month</li>
              <li>Basic AI extraction</li>
              <li>CSV export</li>
            </ul>
            <a routerLink="/register" class="btn btn-outline">Start Free</a>
          </div>
          <div class="pricing-card featured">
            <h3>Starter</h3>
            <p class="price">$29<span>/month</span></p>
            <ul>
              <li>100 documents/month</li>
              <li>Advanced AI extraction</li>
              <li>Priority support</li>
              <li>2FA security</li>
            </ul>
            <a routerLink="/register" class="btn btn-primary">Get Started</a>
          </div>
          <div class="pricing-card">
            <h3>Growth</h3>
            <p class="price">$99<span>/month</span></p>
            <ul>
              <li>500 documents/month</li>
              <li>API access</li>
              <li>Priority support</li>
              <li>All features</li>
            </ul>
            <a routerLink="/register" class="btn btn-outline">Get Started</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 2rem 0;
    }

    .hero {
      text-align: center;
      padding: 4rem 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 4rem;
    }

    .hero-title {
      font-size: 3rem;
      margin: 0 0 1rem 0;
      font-weight: 700;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      margin: 0 0 2rem 0;
      opacity: 0.9;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .features {
      margin-bottom: 4rem;
    }

    .features h2 {
      text-align: center;
      font-size: 2rem;
      margin-bottom: 2rem;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .feature-card {
      text-align: center;
      padding: 2rem;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .feature-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .pricing {
      margin-bottom: 4rem;
    }

    .pricing h2 {
      text-align: center;
      font-size: 2rem;
      margin-bottom: 2rem;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .pricing-card {
      padding: 2rem;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .pricing-card.featured {
      border: 2px solid #667eea;
      transform: scale(1.05);
    }

    .price {
      font-size: 2.5rem;
      font-weight: 700;
      color: #667eea;
      margin: 1rem 0;
    }

    .price span {
      font-size: 1rem;
      color: #6c757d;
    }

    .pricing-card ul {
      list-style: none;
      padding: 0;
      margin: 2rem 0;
    }

    .pricing-card li {
      padding: 0.5rem 0;
    }

    .btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
    }

    .btn-primary {
      background: white;
      color: #667eea;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .btn-secondary {
      background: transparent;
      color: white;
      border-color: white;
    }

    .btn-secondary:hover {
      background: white;
      color: #667eea;
    }

    .btn-outline {
      background: transparent;
      color: #667eea;
      border-color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }
  `]
})
export class HomeComponent {}

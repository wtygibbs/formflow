import { Injectable, signal, computed, effect } from '@angular/core';

export type SidenavMode = 'expanded' | 'collapsed';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly STORAGE_KEY = 'sidenav_mode';
  private readonly MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind

  // Signals for reactive state
  private _sidenavMode = signal<SidenavMode>(this.getInitialSidenavMode());
  private _isMobile = signal<boolean>(this.checkIsMobile());

  // Public computed signals
  sidenavMode = this._sidenavMode.asReadonly();
  isMobile = this._isMobile.asReadonly();

  // Computed: should sidenav be expanded?
  isExpanded = computed(() => this._sidenavMode() === 'expanded');

  // Computed: should sidenav be collapsed?
  isCollapsed = computed(() => this._sidenavMode() === 'collapsed');

  constructor() {
    // Listen for window resize events
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.onResize());

      // Auto-adjust sidenav mode based on screen size on init
      this.autoAdjustForScreenSize();
    }

    // Persist sidenav mode to localStorage
    effect(() => {
      const mode = this._sidenavMode();
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, mode);
      }
    });
  }

  /**
   * Toggle sidenav between expanded and collapsed
   */
  toggleSidenav(): void {
    const currentMode = this._sidenavMode();
    this._sidenavMode.set(currentMode === 'expanded' ? 'collapsed' : 'expanded');
  }

  /**
   * Set sidenav mode explicitly
   */
  setSidenavMode(mode: SidenavMode): void {
    this._sidenavMode.set(mode);
  }

  /**
   * Expand sidenav
   */
  expandSidenav(): void {
    this._sidenavMode.set('expanded');
  }

  /**
   * Collapse sidenav
   */
  collapseSidenav(): void {
    this._sidenavMode.set('collapsed');
  }

  /**
   * Get initial sidenav mode from localStorage or default based on screen size
   */
  private getInitialSidenavMode(): SidenavMode {
    if (typeof window === 'undefined') {
      return 'collapsed';
    }

    // Check if user has a saved preference
    const saved = localStorage.getItem(this.STORAGE_KEY) as SidenavMode | null;
    if (saved === 'expanded' || saved === 'collapsed') {
      return saved;
    }

    // Default: expanded on desktop, collapsed on mobile
    return this.checkIsMobile() ? 'collapsed' : 'expanded';
  }

  /**
   * Check if current screen size is mobile
   */
  private checkIsMobile(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < this.MOBILE_BREAKPOINT;
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const wasMobile = this._isMobile();
    const isMobileNow = this.checkIsMobile();

    this._isMobile.set(isMobileNow);

    // If screen size changed between mobile and desktop, auto-adjust sidenav
    if (wasMobile !== isMobileNow) {
      this.autoAdjustForScreenSize();
    }
  }

  /**
   * Auto-adjust sidenav mode based on screen size
   * Only adjusts if user hasn't manually set a preference
   */
  private autoAdjustForScreenSize(): void {
    // Only auto-adjust if no user preference is saved
    const hasUserPreference = typeof window !== 'undefined' &&
                               localStorage.getItem(this.STORAGE_KEY) !== null;

    if (!hasUserPreference) {
      this._sidenavMode.set(this._isMobile() ? 'collapsed' : 'expanded');
    }
  }
}

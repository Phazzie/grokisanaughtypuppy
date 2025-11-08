/**
 * Accessibility Service
 * Manages keyboard navigation, screen reader support, and accessibility features
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface FocusTrap {
  element: HTMLElement;
  handler: (e: KeyboardEvent) => void;
}

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private focusTrapStack: FocusTrap[] = [];
  private reducedMotion$ = new BehaviorSubject<boolean>(false);
  private highContrast$ = new BehaviorSubject<boolean>(false);
  private reducedMotionListener: ((e: MediaQueryListEvent) => void) | null = null;
  private highContrastListener: ((e: MediaQueryListEvent) => void) | null = null;
  private reducedMotionMediaQuery: MediaQueryList | null = null;
  private highContrastMediaQuery: MediaQueryList | null = null;

  constructor() {
    this.detectReducedMotion();
    this.detectHighContrast();
  }

  /**
   * Detect if user prefers reduced motion
   */
  private detectReducedMotion(): void {
    this.reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion$.next(this.reducedMotionMediaQuery.matches);

    this.reducedMotionListener = (e: MediaQueryListEvent) => {
      this.reducedMotion$.next(e.matches);
      this.applyReducedMotion(e.matches);
    };

    this.reducedMotionMediaQuery.addEventListener('change', this.reducedMotionListener);

    if (this.reducedMotionMediaQuery.matches) {
      this.applyReducedMotion(true);
    }
  }

  /**
   * Detect if user prefers high contrast
   */
  private detectHighContrast(): void {
    this.highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    this.highContrast$.next(this.highContrastMediaQuery.matches);

    this.highContrastListener = (e: MediaQueryListEvent) => {
      this.highContrast$.next(e.matches);
      this.applyHighContrast(e.matches);
    };

    this.highContrastMediaQuery.addEventListener('change', this.highContrastListener);
  }

  /**
   * Apply reduced motion styles
   */
  private applyReducedMotion(reduced: boolean): void {
    if (reduced) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
    } else {
      document.documentElement.style.setProperty('--animation-duration', '300ms');
      document.documentElement.style.setProperty('--transition-duration', '300ms');
    }
  }

  /**
   * Apply high contrast styles
   */
  private applyHighContrast(highContrast: boolean): void {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  /**
   * Trap focus within a specific element
   */
  trapFocus(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    this.focusTrapStack.push({ element, handler: handleKeyDown });
    firstElement.focus();
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    const trap = this.focusTrapStack.pop();
    if (trap) {
      trap.element.removeEventListener('keydown', trap.handler);
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    const timeoutId = setTimeout(() => {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    }, 1000);

    // Store timeout for potential cleanup
    (announcement as any).__timeoutId = timeoutId;
  }

  /**
   * Get reduced motion preference
   */
  get reducedMotionPreference() {
    return this.reducedMotion$.asObservable();
  }

  /**
   * Get high contrast preference
   */
  get highContrastPreference() {
    return this.highContrast$.asObservable();
  }

  /**
   * Skip to main content
   */
  skipToMainContent(): void {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      (main as HTMLElement).focus();
      (main as HTMLElement).scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Cleanup method to remove event listeners
   * Call this when the service is destroyed (not common for root services)
   */
  ngOnDestroy(): void {
    // Remove media query listeners
    if (this.reducedMotionMediaQuery && this.reducedMotionListener) {
      this.reducedMotionMediaQuery.removeEventListener('change', this.reducedMotionListener);
    }
    if (this.highContrastMediaQuery && this.highContrastListener) {
      this.highContrastMediaQuery.removeEventListener('change', this.highContrastListener);
    }

    // Remove all focus trap listeners
    while (this.focusTrapStack.length > 0) {
      this.releaseFocusTrap();
    }
  }
}

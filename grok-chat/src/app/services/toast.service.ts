/**
 * Toast Notification Service
 * Provides user feedback through toast notifications
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);

  /**
   * Show a success toast
   */
  success(message: string, duration = 3000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'success',
      duration
    });
  }

  /**
   * Show an error toast
   */
  error(message: string, duration = 5000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'error',
      duration
    });
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration = 4000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'warning',
      duration
    });
  }

  /**
   * Show an info toast
   */
  info(message: string, duration = 3000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'info',
      duration
    });
  }

  /**
   * Show a toast with custom configuration
   */
  show(toast: Toast): void {
    const currentToasts = this.toasts$.value;
    this.toasts$.next([...currentToasts, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string): void {
    const currentToasts = this.toasts$.value;
    this.toasts$.next(currentToasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toasts$.next([]);
  }

  /**
   * Get toasts observable
   */
  get toasts() {
    return this.toasts$.asObservable();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

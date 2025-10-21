import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container fixed top-4 right-4 z-50 space-y-2">
      <div *ngFor="let toast of toasts"
           [class]="getToastClasses(toast)"
           class="toast animate-slide-in">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ getToastIcon(toast.type) }}</span>
          <p class="flex-1">{{ toast.message }}</p>
          <button (click)="dismiss(toast.id)" 
                  class="hover:opacity-70 transition-opacity"
                  aria-label="Dismiss notification">
            ✕
          </button>
        </div>
        <button *ngIf="toast.action"
                (click)="handleAction(toast)"
                class="mt-2 text-sm underline hover:no-underline">
          {{ toast.action.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast {
      min-width: 300px;
      max-width: 500px;
      padding: 1rem;
      border-radius: 0.75rem;
      backdrop-filter: blur(24px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .toast-success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }
    
    .toast-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    
    .toast-warning {
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      color: #fbbf24;
    }
    
    .toast-info {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
    }

    @media (max-width: 640px) {
      .toast-container {
        left: 1rem;
        right: 1rem;
      }
      .toast {
        min-width: auto;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toasts.subscribe(
      toasts => this.toasts = toasts
    );
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  handleAction(toast: Toast) {
    toast.action?.callback();
    this.dismiss(toast.id);
  }

  getToastClasses(toast: Toast): string {
    return `toast-${toast.type}`;
  }

  getToastIcon(type: Toast['type']): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type];
  }
}

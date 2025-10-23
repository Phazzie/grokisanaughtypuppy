import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showInstallPrompt" 
         class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 
                glass-effect rounded-2xl p-4 animate-slide-in z-50">
      <div class="flex items-start gap-3">
        <span class="text-3xl">📱</span>
        <div class="flex-1">
          <h3 class="font-bold mb-2">Install Grok Chat</h3>
          <p class="text-sm text-gray-300 mb-3">
            Install this app on your device for a better experience and offline access!
          </p>
          <div class="flex gap-2">
            <button (click)="install()" 
                    class="px-4 py-2 bg-gradient-to-r from-grok-purple to-grok-pink rounded-lg hover:shadow-lg transition-all">
              Install
            </button>
            <button (click)="dismiss()" 
                    class="px-4 py-2 glass-effect rounded-lg hover:bg-white/10 transition-all">
              Maybe Later
            </button>
          </div>
        </div>
        <button (click)="dismiss()" class="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  `,
  styles: [`
    .glass-effect {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .from-grok-purple {
      --tw-gradient-from: #7c3aed;
    }

    .to-grok-pink {
      --tw-gradient-to: #ec4899;
    }
  `]
})
export class InstallPromptComponent implements OnInit {
  showInstallPrompt = false;
  private deferredPrompt: any;
  private dismissalKey = 'installPromptDismissed';
  private dismissalCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  ngOnInit() {
    // Check if user has dismissed recently
    const dismissed = localStorage.getItem(this.dismissalKey);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const now = Date.now();
      if (now - dismissedTime < this.dismissalCooldown) {
        return; // Still in cooldown period
      }
    }

    // Listen for install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt = true;
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.showInstallPrompt = false;
      this.deferredPrompt = null;
    });
  }

  async install() {
    if (!this.deferredPrompt) return;
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }
    
    this.deferredPrompt = null;
    this.showInstallPrompt = false;
  }

  dismiss() {
    this.showInstallPrompt = false;
    // Remember dismissal with timestamp
    localStorage.setItem(this.dismissalKey, Date.now().toString());
  }
}

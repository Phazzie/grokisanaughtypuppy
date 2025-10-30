import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationBranch, ConversationNode } from '../../services/conversation-branch.service';

@Component({
  selector: 'app-branch-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="branch-tree glass-effect rounded-2xl p-4 mb-4">
      <!-- Navigation Controls -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <button
          (click)="onGoBack()"
          [disabled]="!canGoBack"
          class="px-3 py-2 glass-effect rounded-lg hover:bg-white/10 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go back in conversation history"
        >
          ⬅️ Back
        </button>
        <button
          (click)="onGoForward()"
          [disabled]="!canGoForward"
          class="px-3 py-2 glass-effect rounded-lg hover:bg-white/10 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Go forward in conversation history"
        >
          Forward ➡️
        </button>
        <button
          (click)="onFork()"
          class="px-4 py-2 bg-gradient-to-r from-grok-purple to-grok-pink rounded-lg hover:shadow-lg transition-all text-sm font-medium"
          aria-label="Fork conversation at current point"
        >
          🔀 Fork Branch
        </button>
        <div class="flex-1"></div>
        <div class="text-xs text-gray-400">
          {{ nodePath.length }} nodes • Branch: {{ branch?.name || 'Main' }}
        </div>
      </div>

      <!-- Conversation Path Visualization -->
      <div class="conversation-path space-y-2 max-h-64 overflow-y-auto">
        <div
          *ngFor="let node of nodePath; let i = index"
          [class.current-node]="i === nodePath.length - 1"
          (click)="onNodeClick(node)"
          class="path-node cursor-pointer"
          [attr.aria-label]="'Message ' + (i + 1) + ' by ' + node.message.role"
        >
          <div class="flex items-start gap-3">
            <div class="node-icon" [attr.aria-hidden]="true">
              {{ getNodeIcon(node.message.role) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="node-role font-semibold text-sm">
                  {{ node.message.role }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ node.timestamp | date:'short' }}
                </span>
              </div>
              <p class="node-preview text-sm truncate">
                {{ getPreview(node.message.content) }}
              </p>
              <div *ngIf="node.children.length > 1" class="branch-indicator mt-1 text-xs">
                🔀 {{ node.children.length }} branches available
              </div>
            </div>
            <div *ngIf="i === nodePath.length - 1" class="current-badge" aria-label="Current message">
              📍
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!nodePath || nodePath.length === 0" class="text-center py-8 text-gray-400">
        <div class="text-4xl mb-2">🌳</div>
        <p class="text-sm">No conversation history yet</p>
        <p class="text-xs mt-1">Start chatting to build your conversation tree</p>
      </div>
    </div>
  `,
  styles: [`
    .path-node {
      padding: 0.75rem;
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      transition: all 0.2s;
    }
    
    .path-node:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateX(4px);
    }
    
    .path-node.current-node {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(236, 72, 153, 0.15));
      border-left: 3px solid #7c3aed;
    }
    
    .node-icon {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      background: rgba(124, 58, 237, 0.2);
      font-size: 1.25rem;
    }
    
    .node-role {
      color: #c084fc;
      text-transform: capitalize;
    }
    
    .node-preview {
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
    }
    
    .branch-indicator {
      color: #ec4899;
      font-weight: 500;
    }
    
    .current-badge {
      font-size: 1.25rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .conversation-path::-webkit-scrollbar {
      width: 6px;
    }

    .conversation-path::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .conversation-path::-webkit-scrollbar-thumb {
      background: rgba(124, 58, 237, 0.3);
      border-radius: 3px;
    }

    .conversation-path::-webkit-scrollbar-thumb:hover {
      background: rgba(124, 58, 237, 0.5);
    }
  `]
})
export class BranchTreeComponent {
  @Input() branch?: ConversationBranch;
  @Input() nodePath: ConversationNode[] = [];
  @Input() canGoBack = false;
  @Input() canGoForward = false;

  @Output() goBack = new EventEmitter<void>();
  @Output() goForward = new EventEmitter<void>();
  @Output() fork = new EventEmitter<void>();
  @Output() nodeClick = new EventEmitter<ConversationNode>();

  onGoBack() {
    this.goBack.emit();
  }

  onGoForward() {
    this.goForward.emit();
  }

  onFork() {
    this.fork.emit();
  }

  onNodeClick(node: ConversationNode) {
    this.nodeClick.emit(node);
  }

  getPreview(content: string): string {
    const maxLength = 100;
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  getNodeIcon(role: string): string {
    const icons: Record<string, string> = {
      'system': '⚙️',
      'user': '👤',
      'assistant': '🤖'
    };
    return icons[role] || '💬';
  }
}

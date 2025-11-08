import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ChatService,
  Topic,
  Conversation,
  ConversationWithAnalysis,
  Import,
  Insight
} from '../services/chat.service';

type ViewMode = 'upload' | 'topics' | 'conversations' | 'viewer';

@Component({
  selector: 'app-conversation-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-library.component.html',
  styleUrls: ['./conversation-library.component.scss']
})
export class ConversationLibraryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State signals
  protected viewMode = signal<ViewMode>('upload');
  protected topics = signal<Topic[]>([]);
  protected conversations = signal<Conversation[]>([]);
  protected selectedTopic = signal<Topic | null>(null);
  protected selectedConversation = signal<ConversationWithAnalysis | null>(null);
  protected imports = signal<Import[]>([]);
  protected isLoading = signal(false);
  protected error = signal('');

  // Upload state
  protected selectedFile: File | null = null;
  protected uploadProgress = signal<Import | null>(null);
  protected uploadPollingInterval: any = null;

  // User ID (in production, this would come from auth)
  private userId = 'anonymous';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.loadTopics();
    this.loadImports();
  }

  ngOnDestroy() {
    if (this.uploadPollingInterval) {
      clearInterval(this.uploadPollingInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============ FILE UPLOAD ============

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error.set('');
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.error.set('Please select a file to upload');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    this.chatService.uploadConversations(this.selectedFile, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.uploadProgress.set({
            id: response.importId,
            user_id: this.userId,
            filename: this.selectedFile!.name,
            file_size: this.selectedFile!.size,
            status: 'processing',
            total_conversations: response.totalConversations,
            processed_conversations: 0,
            created_at: new Date().toISOString()
          });

          // Start polling for progress
          this.startProgressPolling(response.importId);

          this.selectedFile = null;
          (document.getElementById('fileInput') as HTMLInputElement).value = '';
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Failed to upload file');
          this.isLoading.set(false);
        }
      });
  }

  startProgressPolling(importId: string) {
    this.uploadPollingInterval = setInterval(() => {
      this.chatService.getImportStatus(importId, this.userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (importStatus) => {
            this.uploadProgress.set(importStatus);

            if (importStatus.status === 'completed' || importStatus.status === 'failed') {
              clearInterval(this.uploadPollingInterval);
              this.isLoading.set(false);

              if (importStatus.status === 'completed') {
                this.loadTopics();
                this.loadImports();
              } else {
                this.error.set(importStatus.error_message || 'Import failed');
              }
            }
          },
          error: (err) => {
            clearInterval(this.uploadPollingInterval);
            this.isLoading.set(false);
            this.error.set('Failed to check import status');
          }
        });
    }, 2000); // Poll every 2 seconds
  }

  // ============ TOPICS ============

  loadTopics() {
    this.chatService.listTopics(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (topics) => {
          this.topics.set(topics);
        },
        error: (err) => {
          this.error.set('Failed to load topics');
        }
      });
  }

  selectTopic(topic: Topic) {
    this.selectedTopic.set(topic);
    this.viewMode.set('conversations');
    this.loadConversationsByTopic(topic.id);
  }

  loadConversationsByTopic(topicId: string) {
    this.isLoading.set(true);
    this.chatService.getConversationsByTopic(topicId, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations) => {
          this.conversations.set(conversations);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load conversations');
          this.isLoading.set(false);
        }
      });
  }

  // ============ CONVERSATIONS ============

  selectConversation(conversation: Conversation) {
    this.isLoading.set(true);
    this.chatService.getConversation(conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullConversation) => {
          this.selectedConversation.set(fullConversation);
          this.viewMode.set('viewer');
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load conversation details');
          this.isLoading.set(false);
        }
      });
  }

  // ============ IMPORTS ============

  loadImports() {
    this.chatService.listImports(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (imports) => {
          this.imports.set(imports);
        },
        error: (err) => {
          // Silently fail - imports list is not critical
        }
      });
  }

  // ============ NAVIGATION ============

  goToUpload() {
    this.viewMode.set('upload');
  }

  goToTopics() {
    this.viewMode.set('topics');
    this.loadTopics();
  }

  backToConversations() {
    this.viewMode.set('conversations');
  }

  backToTopics() {
    this.viewMode.set('topics');
    this.selectedTopic.set(null);
  }

  // ============ UTILITIES ============

  getProgressPercentage(): number {
    const progress = this.uploadProgress();
    if (!progress || progress.total_conversations === 0) return 0;
    return Math.round((progress.processed_conversations / progress.total_conversations) * 100);
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getInsightsByType(insights: Insight[], type: string): Insight[] {
    return insights.filter(i => i.insight_type === type);
  }

  getAdditionalInsights(insights: Insight[]): Insight[] {
    return insights.filter(i => i.insight_type !== 'high_point' && i.insight_type !== 'low_point');
  }

  getSentimentColor(sentiment: string): string {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'mixed': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  }

  getComplexityLabel(score: number): string {
    if (score < 0.3) return 'Simple';
    if (score < 0.7) return 'Moderate';
    return 'Complex';
  }
}

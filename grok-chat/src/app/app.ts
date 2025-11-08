import { Component, signal, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, Message } from './services/chat.service';
import { ConversationLibraryComponent } from './conversation-library/conversation-library.component';

interface ChatBranch {
  id: string;
  messages: Message[];
  temperature: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule, HttpClientModule, ConversationLibraryComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true
})
export class App implements OnDestroy {
  protected readonly title = signal('Grok Chat');
  private destroy$ = new Subject<void>();

  // View mode: 'chat' or 'library'
  viewMode: 'chat' | 'library' = 'chat';

  systemPrompt = 'You are Grok, a helpful, witty, and rebellious AI assistant. You provide insightful answers while maintaining a playful personality.';
  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  error = '';

  // Advanced features
  showSystemPrompt = false;
  comparisonMode = false;
  comparisonBranches: ChatBranch[] = [];
  selectedBranchForComparison = 0;
  temperature = 0.7;
  showThinking = true;
  chatHistory: { name: string; messages: Message[]; timestamp: Date }[] = [];

  // Evaluation
  showEvaluation = false;
  evaluationResult = '';
  evaluationLoading = false;
  evaluationCriteria = 'Quality, accuracy, helpfulness, creativity, and clarity';

  apiKeyConfigured = false;
  testingApi = false;
  testJoke = '';

  constructor(private chatService: ChatService) {
    this.checkApiKey();
  }

  switchView(mode: 'chat' | 'library') {
    this.viewMode = mode;
  }

  testApi() {
    this.testingApi = true;
    this.testJoke = '';
    this.error = '';

    this.chatService.testApiWithJoke()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.testJoke = response.choices[0].message.content;
          this.testingApi = false;
        },
        error: (err) => {
          this.error = 'API test failed: ' + (err.error?.error || 'Please check your API key configuration');
          this.testingApi = false;
        }
      });
  }

  checkApiKey() {
    this.chatService.checkHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.apiKeyConfigured = response.hasApiKey;
          if (!this.apiKeyConfigured) {
            this.error = 'API Key not configured. Please set XAI_API_KEY in backend/.env';
          }
        },
        error: () => {
          this.error = 'Cannot connect to backend server. Please start the backend server.';
        }
      });
  }

  sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.currentMessage = '';
    this.isLoading = true;
    this.error = '';

    if (this.comparisonMode) {
      this.sendComparisonMessages(userMessage);
    } else {
      this.sendSingleMessage();
    }
  }

  sendSingleMessage() {
    this.chatService.sendMessage(this.messages, this.systemPrompt, this.temperature)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const assistantMessage: Message = {
            role: 'assistant',
            content: response.choices[0].message.content,
            timestamp: new Date()
          };
          this.messages.push(assistantMessage);
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to get response';
          this.isLoading = false;
        }
      });
  }

  sendComparisonMessages(userMessage: Message) {
    const temperatures = [0.3, 0.7, 1.0];
    this.comparisonBranches = temperatures.map((temp, index) => ({
      id: `branch-${index}`,
      messages: [...this.messages],
      temperature: temp
    }));

    let completed = 0;
    temperatures.forEach((temp, index) => {
      const branchMessages = this.comparisonBranches[index].messages.slice(0, -1);
      this.chatService.sendMessage(branchMessages, this.systemPrompt, temp)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.comparisonBranches[index].messages.push({
              role: 'assistant',
              content: response.choices[0].message.content,
              timestamp: new Date()
            });
            completed++;
            if (completed === temperatures.length) {
              this.isLoading = false;
            }
          },
          error: (error) => {
            this.error = error.error?.error || 'Failed to get response';
            completed++;
            if (completed === temperatures.length) {
              this.isLoading = false;
            }
          }
        });
    });
  }

  regenerateResponse() {
    if (this.messages.length < 2) return;
    
    // Remove last assistant message
    this.messages = this.messages.slice(0, -1);
    this.isLoading = true;
    
    this.sendSingleMessage();
  }

  evaluateOutputs() {
    if (this.comparisonBranches.length === 0) {
      this.error = 'No outputs to evaluate. Enable comparison mode first.';
      return;
    }

    this.evaluationLoading = true;
    const outputs = this.comparisonBranches.map(branch => {
      const lastMsg = branch.messages[branch.messages.length - 1];
      return lastMsg?.content || '';
    }).filter(content => content.length > 0);

    const context = this.messages[this.messages.length - 1]?.content || '';

    this.chatService.evaluateOutputs(outputs, this.evaluationCriteria, context)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.evaluationResult = response.choices[0].message.content;
          this.showEvaluation = true;
          this.evaluationLoading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to evaluate outputs';
          this.evaluationLoading = false;
        }
      });
  }

  toggleComparisonMode() {
    this.comparisonMode = !this.comparisonMode;
    if (!this.comparisonMode) {
      this.comparisonBranches = [];
    }
  }

  selectBranchForComparison(index: number) {
    this.selectedBranchForComparison = index;
    const selectedBranch = this.comparisonBranches[index];
    this.messages = [...selectedBranch.messages];
    this.temperature = selectedBranch.temperature;
    this.comparisonMode = false;
    this.comparisonBranches = [];
  }

  saveConversation() {
    const name = prompt('Enter a name for this conversation:');
    if (name) {
      this.chatHistory.push({
        name,
        messages: [...this.messages],
        timestamp: new Date()
      });
      alert('Conversation saved!');
    }
  }

  loadConversation(index: number) {
    const conversation = this.chatHistory[index];
    this.messages = [...conversation.messages];
    this.comparisonMode = false;
    this.comparisonBranches = [];
  }

  exportConversation() {
    const conversation = {
      systemPrompt: this.systemPrompt,
      messages: this.messages,
      timestamp: new Date()
    };
    
    const dataStr = JSON.stringify(conversation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grok-chat-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  clearChat() {
    if (confirm('Are you sure you want to clear the chat?')) {
      this.messages = [];
      this.comparisonBranches = [];
      this.comparisonMode = false;
      this.error = '';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


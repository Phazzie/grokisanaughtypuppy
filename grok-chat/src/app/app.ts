import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ChatService, Message } from './services/chat.service';
import { ToastService } from './services/toast.service';
import { AccessibilityService } from './services/accessibility.service';
import { AnalyticsService } from './services/analytics.service';
import { ToastContainerComponent } from './components/toast/toast.component';
import { InstallPromptComponent } from './components/install-prompt/install-prompt.component';

interface ChatBranch {
  id: string;
  messages: Message[];
  temperature: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule, HttpClientModule, ToastContainerComponent, InstallPromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true
})
export class App implements OnInit {
  protected readonly title = signal('Grok Chat');
  
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

  constructor(
    private chatService: ChatService,
    private toastService: ToastService,
    private accessibilityService: AccessibilityService,
    private analyticsService: AnalyticsService
  ) {
    this.checkApiKey();
  }

  ngOnInit() {
    // Initialize accessibility features
    this.accessibilityService.reducedMotionPreference.subscribe(
      reduced => {
        if (reduced) {
          document.body.classList.add('reduce-motion');
        } else {
          document.body.classList.remove('reduce-motion');
        }
      }
    );

    // Initialize analytics tracking
    this.analyticsService.getCoreWebVitals();
    this.analyticsService.trackPageView('/', 'Grok Chat Home');

    // Track memory usage every 30 seconds
    setInterval(() => {
      this.analyticsService.getMemoryUsage();
    }, 30000);
  }

  checkApiKey() {
    this.chatService.checkHealth().subscribe({
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
    const startTime = Date.now();
    const messageLength = this.currentMessage.length;

    // Analytics: Track message sent
    this.analyticsService.trackMessageSent(
      messageLength,
      this.temperature,
      !!this.systemPrompt
    );

    // Accessibility: Announce to screen readers
    this.accessibilityService.announce('Sending message to Grok', 'polite');

    this.toastService.info('Sending message...');
    this.chatService.sendMessage(this.messages, this.systemPrompt, this.temperature).subscribe({
      next: (response) => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.choices[0].message.content,
          timestamp: new Date()
        };
        this.messages.push(assistantMessage);
        this.isLoading = false;

        // Analytics: Track response received
        const duration = Date.now() - startTime;
        const responseLength = response.choices[0].message.content.length;
        this.analyticsService.trackMessageReceived(
          responseLength,
          duration,
          this.temperature
        );
        this.analyticsService.trackAPIResponseTime('chat', duration);

        // Accessibility: Announce response
        this.accessibilityService.announce('Response received from Grok', 'polite');
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to get response';
        this.toastService.error('Failed to send message. Please try again.');
        this.isLoading = false;

        // Analytics: Track error
        this.analyticsService.trackError(error, 'sendMessage');

        // Accessibility: Announce error
        this.accessibilityService.announce('Error: Failed to send message', 'assertive');
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
      this.chatService.sendMessage(branchMessages, this.systemPrompt, temp).subscribe({
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

    this.chatService.evaluateOutputs(outputs, this.evaluationCriteria, context).subscribe({
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
    const action = this.comparisonMode ? 'disable' : 'enable';
    this.analyticsService.trackFeatureUsage('A/B Testing', action);
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
      this.toastService.success('Conversation saved successfully!');
      this.analyticsService.trackFeatureUsage('Save', 'conversation_save');
      this.accessibilityService.announce('Conversation saved successfully', 'polite');
    }
  }

  loadConversation(index: number) {
    const conversation = this.chatHistory[index];
    this.messages = [...conversation.messages];
    this.comparisonMode = false;
    this.comparisonBranches = [];
    this.toastService.success('Conversation loaded successfully!');
    this.analyticsService.trackFeatureUsage('Load', 'conversation_load');
    this.accessibilityService.announce('Conversation loaded successfully', 'polite');
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
    this.toastService.success('Conversation exported successfully!');
    this.analyticsService.trackFeatureUsage('Export', 'conversation_export');
    this.accessibilityService.announce('Conversation exported successfully', 'polite');
  }

  clearChat() {
    if (confirm('Are you sure you want to clear the chat?')) {
      this.messages = [];
      this.comparisonBranches = [];
      this.comparisonMode = false;
      this.error = '';
    }
  }
}


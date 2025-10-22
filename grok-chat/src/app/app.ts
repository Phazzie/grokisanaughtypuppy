import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ChatService, Message } from './services/chat.service';
import { ToastService } from './services/toast.service';
import { AccessibilityService } from './services/accessibility.service';
import { AnalyticsService } from './services/analytics.service';
import { ConversationBranchService, ConversationBranch, ConversationNode } from './services/conversation-branch.service';
import { ToastContainerComponent } from './components/toast/toast.component';
import { InstallPromptComponent } from './components/install-prompt/install-prompt.component';
import { BranchTreeComponent } from './components/branch-tree/branch-tree.component';

interface ChatBranch {
  id: string;
  messages: Message[];
  temperature: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule, HttpClientModule, ToastContainerComponent, InstallPromptComponent, BranchTreeComponent],
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
  
  // Conversation Branching
  enableBranching = false;
  currentBranch?: ConversationBranch;
  nodePath: ConversationNode[] = [];
  canGoBack = false;
  canGoForward = false;
  
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
    private analyticsService: AnalyticsService,
    private branchService: ConversationBranchService
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
      
      // Clear branching state
      if (this.enableBranching) {
        this.currentBranch = undefined;
        this.nodePath = [];
        this.updateBranchingState();
      }
    }
  }

  // ============================================================
  // CONVERSATION BRANCHING METHODS
  // ============================================================

  /**
   * Toggle conversation branching mode
   */
  toggleBranching() {
    this.enableBranching = !this.enableBranching;
    
    if (this.enableBranching && !this.currentBranch) {
      // Initialize branching with current conversation
      this.initializeBranching();
      this.toastService.success('Conversation branching enabled! 🌳');
      this.accessibilityService.announce('Conversation branching enabled', 'polite');
    } else if (!this.enableBranching) {
      this.toastService.info('Branching disabled. Using linear mode.');
    }
    
    this.analyticsService.trackFeatureUsage('Branching', this.enableBranching ? 'enable' : 'disable');
  }

  /**
   * Initialize branching with current conversation
   */
  private initializeBranching() {
    this.currentBranch = this.branchService.createBranch(
      'Main Branch',
      this.systemPrompt,
      this.temperature
    );

    // Add existing messages to the branch
    if (this.messages.length > 0) {
      let parentNodeId = this.currentBranch.rootNodeId;
      
      for (const message of this.messages) {
        const node = this.branchService.addMessage(
          this.currentBranch.id,
          message,
          parentNodeId,
          { temperature: this.temperature, systemPrompt: this.systemPrompt }
        );
        if (node) {
          parentNodeId = node.id;
        }
      }
    }

    this.updateBranchingState();
  }

  /**
   * Update branching state (node path, navigation)
   */
  private updateBranchingState() {
    if (!this.currentBranch) return;

    const branch = this.branchService.getConversationTree(this.currentBranch.id);
    if (branch) {
      this.nodePath = this.getNodePathArray(branch, this.currentBranch.currentNodeId);
    }

    // Update navigation state
    this.canGoBack = this.branchService['historyIndex'] > 0;
    this.canGoForward = this.branchService['historyIndex'] < this.branchService['history'].length - 1;
  }

  /**
   * Get node path as array
   */
  private getNodePathArray(rootNode: ConversationNode, targetNodeId: string): ConversationNode[] {
    const path: ConversationNode[] = [];
    this.findNodePath(rootNode, targetNodeId, path);
    return path;
  }

  /**
   * Recursively find path to node
   */
  private findNodePath(node: ConversationNode, targetId: string, path: ConversationNode[]): boolean {
    path.push(node);
    
    if (node.id === targetId) {
      return true;
    }

    for (const childId of node.children) {
      const childNode = this.currentBranch?.nodes.get(childId);
      if (childNode && this.findNodePath(childNode, targetId, path)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  /**
   * Navigate back in conversation history
   */
  onGoBack() {
    if (this.branchService.goBack()) {
      this.syncMessagesFromBranch();
      this.toastService.info('Navigated back in conversation');
      this.accessibilityService.announce('Navigated back in conversation history', 'polite');
    }
  }

  /**
   * Navigate forward in conversation history
   */
  onGoForward() {
    if (this.branchService.goForward()) {
      this.syncMessagesFromBranch();
      this.toastService.info('Navigated forward in conversation');
      this.accessibilityService.announce('Navigated forward in conversation history', 'polite');
    }
  }

  /**
   * Fork conversation at current point
   */
  onFork() {
    if (!this.currentBranch) return;

    const branchName = prompt('Enter name for new branch:', `Branch ${Date.now()}`);
    if (!branchName) return;

    const newBranch = this.branchService.forkConversation(
      this.currentBranch.id,
      this.currentBranch.currentNodeId,
      branchName
    );

    if (newBranch) {
      this.currentBranch = newBranch;
      this.updateBranchingState();
      this.toastService.success(`Forked to "${branchName}" 🔀`);
      this.accessibilityService.announce(`Conversation forked to ${branchName}`, 'polite');
      this.analyticsService.trackFeatureUsage('Branching', 'fork_conversation');
    }
  }

  /**
   * Navigate to a specific node
   */
  onNodeClick(node: ConversationNode) {
    if (!this.currentBranch) return;

    if (this.branchService.timeTravel(this.currentBranch.id, node.id)) {
      this.syncMessagesFromBranch();
      this.toastService.info('Jumped to selected message');
      this.accessibilityService.announce('Jumped to selected message in history', 'polite');
    }
  }

  /**
   * Sync messages from branch to UI
   */
  private syncMessagesFromBranch() {
    if (!this.currentBranch) return;

    const linearMessages = this.branchService.getMessagesLinear(this.currentBranch.id);
    this.messages = linearMessages.filter(m => m.role !== 'system'); // Exclude system prompt from display
    this.updateBranchingState();
  }
}



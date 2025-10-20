/**
 * Conversation Branch Service
 * Implements Git-like branching for AI conversations with time travel
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from './chat.service';

export interface ConversationNode {
  id: string;
  parentId: string | null;
  message: Message;
  children: string[];
  timestamp: Date;
  metadata: {
    temperature: number;
    systemPrompt: string;
    branchName?: string;
    tags?: string[];
  };
}

export interface ConversationBranch {
  id: string;
  name: string;
  nodes: Map<string, ConversationNode>;
  currentNodeId: string;
  rootNodeId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ConversationBranchService {
  private branches$ = new BehaviorSubject<Map<string, ConversationBranch>>(new Map());
  private activeBranchId$ = new BehaviorSubject<string | null>(null);
  private history: string[] = [];
  private historyIndex = -1;

  /**
   * Create a new conversation branch
   */
  createBranch(name: string, systemPrompt: string, temperature: number): ConversationBranch {
    const branchId = this.generateId();
    const rootNodeId = this.generateId();

    const rootNode: ConversationNode = {
      id: rootNodeId,
      parentId: null,
      message: {
        role: 'system',
        content: systemPrompt,
        timestamp: new Date()
      },
      children: [],
      timestamp: new Date(),
      metadata: {
        temperature,
        systemPrompt
      }
    };

    const branch: ConversationBranch = {
      id: branchId,
      name,
      nodes: new Map([[rootNodeId, rootNode]]),
      currentNodeId: rootNodeId,
      rootNodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const branches = this.branches$.value;
    branches.set(branchId, branch);
    this.branches$.next(branches);
    this.activeBranchId$.next(branchId);

    return branch;
  }

  /**
   * Add a message to the current branch
   */
  addMessage(
    branchId: string,
    message: Message,
    parentNodeId: string,
    metadata: Partial<ConversationNode['metadata']> = {}
  ): ConversationNode | null {
    const branch = this.branches$.value.get(branchId);
    if (!branch) return null;

    const nodeId = this.generateId();
    const node: ConversationNode = {
      id: nodeId,
      parentId: parentNodeId,
      message,
      children: [],
      timestamp: new Date(),
      metadata: {
        temperature: metadata.temperature || 0.7,
        systemPrompt: metadata.systemPrompt || '',
        branchName: metadata.branchName,
        tags: metadata.tags
      }
    };

    // Add node to branch
    branch.nodes.set(nodeId, node);

    // Update parent's children
    const parentNode = branch.nodes.get(parentNodeId);
    if (parentNode) {
      parentNode.children.push(nodeId);
    }

    // Update current node
    branch.currentNodeId = nodeId;
    branch.updatedAt = new Date();

    // Add to history
    this.addToHistory(nodeId);

    this.branches$.next(this.branches$.value);
    return node;
  }

  /**
   * Fork a conversation at a specific node
   */
  forkConversation(
    sourceBranchId: string,
    nodeId: string,
    newBranchName: string
  ): ConversationBranch | null {
    const sourceBranch = this.branches$.value.get(sourceBranchId);
    if (!sourceBranch) return null;

    const newBranchId = this.generateId();
    const newNodes = new Map<string, ConversationNode>();

    // Clone all nodes from root to the fork point
    const nodeChain = this.getNodeChain(sourceBranch, nodeId);
    nodeChain.forEach(node => {
      newNodes.set(node.id, { ...node, children: [] });
    });

    const newBranch: ConversationBranch = {
      id: newBranchId,
      name: newBranchName,
      nodes: newNodes,
      currentNodeId: nodeId,
      rootNodeId: sourceBranch.rootNodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const branches = this.branches$.value;
    branches.set(newBranchId, newBranch);
    this.branches$.next(branches);

    return newBranch;
  }

  /**
   * Time travel to a specific node
   */
  timeTravel(branchId: string, nodeId: string): boolean {
    const branch = this.branches$.value.get(branchId);
    if (!branch || !branch.nodes.has(nodeId)) return false;

    branch.currentNodeId = nodeId;
    branch.updatedAt = new Date();
    this.addToHistory(nodeId);
    this.branches$.next(this.branches$.value);

    return true;
  }

  /**
   * Go back in conversation history
   */
  goBack(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const nodeId = this.history[this.historyIndex];
      const branchId = this.activeBranchId$.value;
      if (branchId) {
        return this.timeTravel(branchId, nodeId);
      }
    }
    return false;
  }

  /**
   * Go forward in conversation history
   */
  goForward(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const nodeId = this.history[this.historyIndex];
      const branchId = this.activeBranchId$.value;
      if (branchId) {
        return this.timeTravel(branchId, nodeId);
      }
    }
    return false;
  }

  /**
   * Get the conversation tree for visualization
   */
  getConversationTree(branchId: string): ConversationNode | null {
    const branch = this.branches$.value.get(branchId);
    if (!branch) return null;

    return branch.nodes.get(branch.rootNodeId) || null;
  }

  /**
   * Get messages as a linear array (from root to current node)
   */
  getMessagesLinear(branchId: string): Message[] {
    const branch = this.branches$.value.get(branchId);
    if (!branch) return [];

    const chain = this.getNodeChain(branch, branch.currentNodeId);
    return chain.map(node => node.message);
  }

  /**
   * Get node chain from root to specific node
   */
  private getNodeChain(branch: ConversationBranch, nodeId: string): ConversationNode[] {
    const chain: ConversationNode[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = branch.nodes.get(currentId);
      if (!node) break;
      chain.unshift(node);
      currentId = node.parentId;
    }

    return chain;
  }

  /**
   * Add node to history
   */
  private addToHistory(nodeId: string): void {
    // Remove any forward history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(nodeId);
    this.historyIndex = this.history.length - 1;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get branches observable
   */
  get branches() {
    return this.branches$.asObservable();
  }

  /**
   * Get active branch ID observable
   */
  get activeBranchId() {
    return this.activeBranchId$.asObservable();
  }

  /**
   * Export branch as JSON
   */
  exportBranch(branchId: string): string {
    const branch = this.branches$.value.get(branchId);
    if (!branch) return '';

    const exportData = {
      ...branch,
      nodes: Array.from(branch.nodes.entries())
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import branch from JSON
   */
  importBranch(jsonData: string): ConversationBranch | null {
    try {
      const data = JSON.parse(jsonData);
      const branch: ConversationBranch = {
        ...data,
        nodes: new Map(data.nodes)
      };

      const branches = this.branches$.value;
      branches.set(branch.id, branch);
      this.branches$.next(branches);

      return branch;
    } catch (error) {
      console.error('Failed to import branch:', error);
      return null;
    }
  }
}

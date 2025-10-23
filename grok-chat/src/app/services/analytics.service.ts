/**
 * Analytics Service
 * Tracks user interactions, performance metrics, and conversation patterns
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AnalyticsEvent {
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface ConversationAnalytics {
  totalMessages: number;
  averageResponseTime: number;
  mostUsedTemperature: number;
  totalTokensUsed: number;
  conversationLength: number;
  topicsDiscussed: string[];
  sentimentScore: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private events$ = new BehaviorSubject<AnalyticsEvent[]>([]);
  private performanceMetrics$ = new BehaviorSubject<PerformanceMetric[]>([]);
  private conversationMetrics$ = new BehaviorSubject<ConversationAnalytics | null>(null);

  /**
   * Track an event
   */
  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      type: 'event',
      category,
      action,
      label,
      value,
      timestamp: new Date(),
      metadata
    };

    const events = this.events$.value;
    events.push(event);
    this.events$.next(events);

    // Send to analytics backend if configured
    this.sendToBackend(event);
  }

  /**
   * Track page view
   */
  trackPageView(path: string, title?: string): void {
    this.trackEvent('navigation', 'page_view', path, undefined, { title });
  }

  /**
   * Track performance metric
   */
  trackPerformance(name: string, value: number, unit: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date()
    };

    const metrics = this.performanceMetrics$.value;
    metrics.push(metric);
    this.performanceMetrics$.next(metrics);
  }

  /**
   * Track API response time
   */
  trackAPIResponseTime(endpoint: string, duration: number): void {
    this.trackPerformance(`api_response_${endpoint}`, duration, 'ms');
    this.trackEvent('api', 'response_time', endpoint, duration);
  }

  /**
   * Track message sent
   */
  trackMessageSent(
    messageLength: number,
    temperature: number,
    hasSystemPrompt: boolean
  ): void {
    this.trackEvent('conversation', 'message_sent', undefined, messageLength, {
      temperature,
      hasSystemPrompt
    });
  }

  /**
   * Track message received
   */
  trackMessageReceived(
    responseLength: number,
    responseTime: number,
    temperature: number
  ): void {
    this.trackEvent('conversation', 'message_received', undefined, responseLength, {
      responseTime,
      temperature
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, action: string): void {
    this.trackEvent('feature', action, featureName);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    this.trackEvent('error', 'exception', error.message, undefined, {
      stack: error.stack,
      context
    });
  }

  /**
   * Calculate conversation analytics
   */
  calculateConversationAnalytics(
    messages: any[],
    responses: any[]
  ): ConversationAnalytics {
    const analytics: ConversationAnalytics = {
      totalMessages: messages.length,
      averageResponseTime: this.calculateAverageResponseTime(responses),
      mostUsedTemperature: this.getMostUsedTemperature(),
      totalTokensUsed: this.estimateTokens(messages),
      conversationLength: messages.reduce((acc, msg) => acc + msg.content.length, 0),
      topicsDiscussed: this.extractTopics(messages),
      sentimentScore: this.analyzeSentiment(messages)
    };

    this.conversationMetrics$.next(analytics);
    return analytics;
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.trackPerformance('lcp', lastEntry.renderTime || lastEntry.loadTime, 'ms');
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.trackPerformance('fid', entry.processingStart - entry.startTime, 'ms');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
          this.trackPerformance('cls', clsScore, 'score');
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): void {
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      this.trackPerformance('memory_used', memory.usedJSHeapSize, 'bytes');
      this.trackPerformance('memory_total', memory.totalJSHeapSize, 'bytes');
      this.trackPerformance('memory_limit', memory.jsHeapSizeLimit, 'bytes');
    }
  }

  /**
   * Generate analytics report
   */
  generateReport(): {
    events: AnalyticsEvent[];
    performance: PerformanceMetric[];
    conversation: ConversationAnalytics | null;
  } {
    return {
      events: this.events$.value,
      performance: this.performanceMetrics$.value,
      conversation: this.conversationMetrics$.value
    };
  }

  /**
   * Export analytics data
   */
  exportData(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Clear analytics data
   */
  clearData(): void {
    this.events$.next([]);
    this.performanceMetrics$.next([]);
    this.conversationMetrics$.next(null);
  }

  // Private helper methods

  private sendToBackend(event: AnalyticsEvent): void {
    // In production, send to analytics backend
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value
      });
    }
  }

  private calculateAverageResponseTime(responses: any[]): number {
    if (responses.length === 0) return 0;
    const total = responses.reduce((acc, r) => acc + (r.responseTime || 0), 0);
    return total / responses.length;
  }

  private getMostUsedTemperature(): number {
    const events = this.events$.value.filter(
      e => e.category === 'conversation' && e.metadata?.['temperature']
    );
    
    if (events.length === 0) return 0.7;

    const temps = events.map(e => e.metadata!['temperature'] as number);
    const tempCounts = temps.reduce((acc, temp) => {
      acc[temp] = (acc[temp] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return parseFloat(
      Object.entries(tempCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0][0]
    );
  }

  private estimateTokens(messages: any[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    const totalChars = messages.reduce((acc, msg) => acc + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  private extractTopics(messages: any[]): string[] {
    // Simple topic extraction (in production, use NLP)
    const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'have', 'has']);
    const words = messages
      .flatMap(msg => msg.content.toLowerCase().split(/\W+/))
      .filter(word => word.length > 4 && !commonWords.has(word));

    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeSentiment(messages: any[]): number {
    // Simple sentiment analysis (in production, use ML model)
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'poor', 'disappointing'];

    let score = 0;
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveWords.forEach(word => {
        if (content.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) score -= 1;
      });
    });

    return Math.max(-1, Math.min(1, score / messages.length));
  }

  get events() {
    return this.events$.asObservable();
  }

  get performanceMetrics() {
    return this.performanceMetrics$.asObservable();
  }

  get conversationMetrics() {
    return this.conversationMetrics$.asObservable();
  }
}

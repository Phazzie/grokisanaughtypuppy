import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  thinking?: string;
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EvaluationResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

export interface UploadResponse {
  success: boolean;
  importId: string;
  totalConversations: number;
  message: string;
}

export interface Import {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  total_conversations: number;
  processed_conversations: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  conversation_count: number;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id?: string;
  name: string;
  system_prompt?: string;
  source?: string;
  original_id?: string;
  original_title?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: Message[];
}

export interface Analysis {
  id: string;
  conversation_id: number;
  summary: string;
  main_topics: string[];
  sentiment: string;
  complexity_score: number;
  analyzed_at: string;
  insights?: Insight[];
}

export interface Insight {
  id: string;
  analysis_id: string;
  insight_type: string;
  title: string;
  description: string;
  message_ids?: string[];
  confidence_score: number;
  created_at: string;
}

export interface ConversationWithAnalysis extends Conversation {
  analysis?: Analysis;
  topics?: Topic[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  sendMessage(messages: Message[], systemPrompt: string, temperature: number = 0.7): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      temperature
    });
  }

  evaluateOutputs(outputs: string[], criteria?: string, context?: string): Observable<EvaluationResponse> {
    return this.http.post<EvaluationResponse>(`${this.apiUrl}/evaluate`, {
      outputs,
      criteria,
      context
    });
  }

  checkHealth(): Observable<{ status: string; hasApiKey: boolean }> {
    return this.http.get<{ status: string; hasApiKey: boolean }>(`${this.apiUrl}/health`);
  }

  // ============ CONVERSATION UPLOAD & ANALYSIS ============

  uploadConversations(file: File, userId: string = 'anonymous'): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getImportStatus(importId: string, userId: string = 'anonymous'): Observable<Import> {
    return this.http.get<Import>(`${this.apiUrl}/imports/${importId}?userId=${userId}`);
  }

  listImports(userId: string = 'anonymous'): Observable<Import[]> {
    return this.http.get<Import[]>(`${this.apiUrl}/imports?userId=${userId}`);
  }

  listTopics(userId?: string): Observable<Topic[]> {
    const url = userId ? `${this.apiUrl}/topics?userId=${userId}` : `${this.apiUrl}/topics`;
    return this.http.get<Topic[]>(url);
  }

  getConversationsByTopic(topicId: string, userId?: string, limit: number = 50, offset: number = 0): Observable<Conversation[]> {
    let url = `${this.apiUrl}/topics/${topicId}/conversations?limit=${limit}&offset=${offset}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    return this.http.get<Conversation[]>(url);
  }

  getConversation(conversationId: number): Observable<ConversationWithAnalysis> {
    return this.http.get<ConversationWithAnalysis>(`${this.apiUrl}/conversations/${conversationId}`);
  }

  listConversations(userId: string = 'anonymous', limit: number = 50, offset: number = 0): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations?userId=${userId}&limit=${limit}&offset=${offset}`);
  }
}

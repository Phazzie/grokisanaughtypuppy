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
}

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { App } from './app';
import { ChatService } from './services/chat.service';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let chatService: jasmine.SpyObj<ChatService>;

  beforeEach(async () => {
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['sendMessage', 'evaluateOutputs', 'checkHealth']);

    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    chatService = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render title correctly', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Grok Chat');
  });

  describe('UI Enhancements', () => {
    
    describe('Animated Background', () => {
      it('should have animated gradient background class', () => {
        fixture.detectChanges();
        const bodyElement = document.body;
        expect(bodyElement.classList.contains('animated-gradient')).toBeTruthy();
      });

      it('should have gradient animation keyframes', () => {
        const styleSheets = Array.from(document.styleSheets);
        const hasGradientAnimation = styleSheets.some(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            return rules.some(rule => 
              rule instanceof CSSKeyframesRule && rule.name === 'gradientShift'
            );
          } catch {
            return false;
          }
        });
        expect(hasGradientAnimation).toBeTruthy();
      });
    });

    describe('Typing Indicator', () => {
      it('should show typing indicator when loading', () => {
        component.isLoading = true;
        component.comparisonMode = false;
        fixture.detectChanges();
        
        const typingIndicator = fixture.debugElement.query(By.css('.typing-indicator'));
        expect(typingIndicator).toBeTruthy();
      });

      it('should hide typing indicator when not loading', () => {
        component.isLoading = false;
        fixture.detectChanges();
        
        const typingIndicator = fixture.debugElement.query(By.css('.typing-indicator'));
        expect(typingIndicator).toBeFalsy();
      });

      it('should have animated dots in typing indicator', () => {
        component.isLoading = true;
        component.comparisonMode = false;
        fixture.detectChanges();
        
        const dots = fixture.debugElement.queryAll(By.css('.typing-indicator .typing-dot'));
        expect(dots.length).toBe(3);
        
        dots.forEach((dot, index) => {
          const animationDelay = dot.nativeElement.style.animationDelay;
          expect(animationDelay).toBe(`${index * 0.15}s`);
        });
      });
    });

    describe('Message Animations', () => {
      it('should apply entrance animation to new messages', () => {
        component.messages = [
          { role: 'user', content: 'Test message', timestamp: new Date() }
        ];
        fixture.detectChanges();
        
        const messageElement = fixture.debugElement.query(By.css('[data-testid="message"]'));
        expect(messageElement?.nativeElement.classList.contains('message-enter')).toBeTruthy();
      });

      it('should stagger message animations', () => {
        component.messages = [
          { role: 'user', content: 'Message 1', timestamp: new Date() },
          { role: 'assistant', content: 'Response 1', timestamp: new Date() },
          { role: 'user', content: 'Message 2', timestamp: new Date() }
        ];
        fixture.detectChanges();
        
        const messageElements = fixture.debugElement.queryAll(By.css('[data-testid="message"]'));
        messageElements.forEach((element, index) => {
          const animationDelay = element.nativeElement.style.animationDelay;
          expect(animationDelay).toBe(`${index * 0.1}s`);
        });
      });
    });

    describe('Enhanced Interactions', () => {
      it('should apply glow effect on button hover', () => {
        fixture.detectChanges();
        const sendButton = fixture.debugElement.query(By.css('[data-testid="send-button"]'));
        expect(sendButton?.nativeElement.classList.contains('glow-hover')).toBeTruthy();
      });

      it('should apply focus glow to input field', () => {
        fixture.detectChanges();
        const messageInput = fixture.debugElement.query(By.css('[data-testid="message-input"]'));
        expect(messageInput?.nativeElement.classList.contains('focus-glow')).toBeTruthy();
      });

      it('should show button press animation', () => {
        fixture.detectChanges();
        const sendButton = fixture.debugElement.query(By.css('[data-testid="send-button"]'));
        
        sendButton?.nativeElement.dispatchEvent(new Event('mousedown'));
        fixture.detectChanges();
        
        expect(sendButton?.nativeElement.classList.contains('button-press')).toBeTruthy();
      });
    });

    describe('Temperature Slider Enhancement', () => {
      it('should display temperature emoji based on value', () => {
        component.showSystemPrompt = true;
        component.temperature = 0.2;
        fixture.detectChanges();
        
        const tempEmoji = fixture.debugElement.query(By.css('[data-testid="temp-emoji"]'));
        expect(tempEmoji?.nativeElement.textContent).toBe('❄️');
        
        component.temperature = 1.8;
        fixture.detectChanges();
        expect(tempEmoji?.nativeElement.textContent).toBe('🔥');
      });

      it('should change slider color based on temperature', () => {
        component.showSystemPrompt = true;
        component.temperature = 0.3;
        fixture.detectChanges();
        
        const slider = fixture.debugElement.query(By.css('[data-testid="temp-slider"]'));
        expect(slider?.nativeElement.classList.contains('temp-cold')).toBeTruthy();
        
        component.temperature = 1.5;
        fixture.detectChanges();
        expect(slider?.nativeElement.classList.contains('temp-hot')).toBeTruthy();
      });
    });

    describe('Settings Panel Animation', () => {
      it('should slide in from right when opened', () => {
        component.showSystemPrompt = false;
        fixture.detectChanges();
        
        component.showSystemPrompt = true;
        fixture.detectChanges();
        
        const settingsPanel = fixture.debugElement.query(By.css('[data-testid="settings-panel"]'));
        expect(settingsPanel?.nativeElement.classList.contains('slide-in-right')).toBeTruthy();
      });

      it('should slide out to right when closed', () => {
        component.showSystemPrompt = true;
        fixture.detectChanges();
        
        component.showSystemPrompt = false;
        fixture.detectChanges();
        
        const settingsPanel = fixture.debugElement.query(By.css('[data-testid="settings-panel"]'));
        expect(settingsPanel).toBeFalsy();
      });
    });

    describe('Enhanced Glass Morphism', () => {
      it('should have ultra-glass effect on main containers', () => {
        fixture.detectChanges();
        const mainContainer = fixture.debugElement.query(By.css('.glass-effect'));
        expect(mainContainer?.nativeElement.classList.contains('ultra-glass')).toBeTruthy();
      });

      it('should have proper backdrop blur values', () => {
        fixture.detectChanges();
        const glassElements = fixture.debugElement.queryAll(By.css('.ultra-glass'));
        
        glassElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element.nativeElement);
          expect(computedStyle.backdropFilter).toContain('blur');
        });
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      fixture.detectChanges();
      
      const sendButton = fixture.debugElement.query(By.css('[data-testid="send-button"]'));
      expect(sendButton?.nativeElement.getAttribute('aria-label')).toBeTruthy();
      
      const messageInput = fixture.debugElement.query(By.css('[data-testid="message-input"]'));
      expect(messageInput?.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });

    it('should respect reduced motion preference', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jasmine.createSpy('matchMedia').and.returnValue({
          matches: true,
          addListener: jasmine.createSpy('addListener'),
          removeListener: jasmine.createSpy('removeListener')
        })
      });
      
      fixture.detectChanges();
      
      const animatedElements = fixture.debugElement.queryAll(By.css('.animate-slide-in'));
      animatedElements.forEach(element => {
        expect(element.nativeElement.classList.contains('reduce-motion')).toBeTruthy();
      });
    });

    it('should have keyboard navigation support', () => {
      fixture.detectChanges();
      
      const messageInput = fixture.debugElement.query(By.css('[data-testid="message-input"]'));
      const enterKeyEvent = new KeyboardEvent('keyup', { key: 'Enter' });
      
      spyOn(component, 'sendMessage');
      messageInput?.nativeElement.dispatchEvent(enterKeyEvent);
      
      expect(component.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Performance Features', () => {
    it('should use CSS transforms for animations (GPU acceleration)', () => {
      fixture.detectChanges();
      
      const animatedElements = fixture.debugElement.queryAll(By.css('.animate-slide-in'));
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element.nativeElement);
        expect(computedStyle.transform).toBeDefined();
      });
    });

    it('should have will-change property for frequently animated elements', () => {
      fixture.detectChanges();
      
      const typingIndicator = fixture.debugElement.query(By.css('.typing-indicator'));
      if (typingIndicator) {
        const computedStyle = window.getComputedStyle(typingIndicator.nativeElement);
        expect(computedStyle.willChange).toBe('transform');
      }
    });
  });
});

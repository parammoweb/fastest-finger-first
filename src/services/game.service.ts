import { Injectable, signal, computed, effect } from '@angular/core';

export type GradeGroup = '1-2' | '3-4' | '5-6' | '7-8' | '9';
export type GamePhase = 'SETUP' | 'READY' | 'ACTIVE' | 'ENDED';

export interface Question {
  text: string;
  options: { id: string; text: string }[];
  correctAnswerId: string;
  gradeGroup: GradeGroup;
}

export interface Submission {
  studentName: string;
  answerId: string;
  timestamp: number; // Time relative to start
  isCorrect?: boolean;
}

export interface GameState {
  phase: GamePhase;
  question: Question | null;
  startTime: number;
  endTime: number;
}

// Messages sent over BroadcastChannel
type ChannelMessage = 
  | { type: 'SYNC_STATE'; state: GameState }
  | { type: 'SUBMIT_ANSWER'; submission: Submission }
  | { type: 'BROADCAST_RESULTS'; results: Submission[] };

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Reactive State
  readonly phase = signal<GamePhase>('SETUP');
  readonly currentQuestion = signal<Question | null>(null);
  readonly submissions = signal<Submission[]>([]);
  readonly startTime = signal<number>(0);
  readonly timeRemaining = signal<number>(30);
  readonly results = signal<Submission[]>([]);
  
  // For students to track their own status
  readonly localStudentName = signal<string>('');
  readonly hasSubmitted = signal<boolean>(false);
  readonly localSubmission = signal<Submission | null>(null);

  private channel = new BroadcastChannel('fastest-finger-quiz');
  private timerInterval: any;

  constructor() {
    // Listen to messages
    this.channel.onmessage = (event) => {
      const msg = event.data as ChannelMessage;
      this.handleMessage(msg);
    };
  }

  private handleMessage(msg: ChannelMessage) {
    switch (msg.type) {
      case 'SYNC_STATE':
        this.phase.set(msg.state.phase);
        this.currentQuestion.set(msg.state.question);
        this.startTime.set(msg.state.startTime);
        
        // If we joined late or refreshed, sync the timer logic roughly
        if (msg.state.phase === 'ACTIVE') {
          const elapsed = (Date.now() - msg.state.startTime) / 1000;
          const remaining = Math.max(0, 30 - elapsed);
          this.timeRemaining.set(Math.floor(remaining));
          // If we aren't the host (who controls the timer), we should start a local countdown
          // But purely visual. The source of truth for 'ENDED' comes from the host.
        } else if (msg.state.phase === 'ENDED' || msg.state.phase === 'SETUP') {
          this.timeRemaining.set(30);
          this.hasSubmitted.set(false); // Reset for next game
        }
        break;

      case 'SUBMIT_ANSWER':
        // Only Host needs to collect these really, but everyone can see count
        this.submissions.update(prev => {
          // Prevent duplicates
          if (prev.find(s => s.studentName === msg.submission.studentName)) {
            return prev;
          }
          return [...prev, msg.submission];
        });
        break;

      case 'BROADCAST_RESULTS':
        this.results.set(msg.results);
        this.phase.set('ENDED');
        break;
    }
  }

  // --- Host Actions ---

  setQuestion(q: Question) {
    this.currentQuestion.set(q);
    this.phase.set('READY');
    this.broadcastState();
  }

  startGame() {
    if (!this.currentQuestion()) return;

    this.phase.set('ACTIVE');
    this.startTime.set(Date.now());
    this.submissions.set([]); // Clear previous
    this.results.set([]);
    this.timeRemaining.set(30);
    this.broadcastState();

    // Start Timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  endGame() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.phase.set('ENDED');
    
    // Calculate Results
    this.calculateResults();
  }

  resetGame() {
    this.phase.set('SETUP');
    this.currentQuestion.set(null);
    this.submissions.set([]);
    this.results.set([]);
    this.broadcastState();
  }

  private calculateResults() {
    const q = this.currentQuestion();
    if (!q) return;

    const allSubs = this.submissions();
    const correctSubs = allSubs
      .filter(s => s.answerId === q.correctAnswerId)
      .map(s => ({ ...s, isCorrect: true }))
      .sort((a, b) => a.timestamp - b.timestamp) // Sort by fastest time
      .slice(0, 30); // Top 30

    this.results.set(correctSubs);
    
    this.channel.postMessage({
      type: 'BROADCAST_RESULTS',
      results: correctSubs
    });

    // Also sync final state to ensure everyone is on ENDED
    this.broadcastState();
  }

  private broadcastState() {
    const state: GameState = {
      phase: this.phase(),
      question: this.currentQuestion(),
      startTime: this.startTime(),
      endTime: 0
    };
    this.channel.postMessage({ type: 'SYNC_STATE', state });
  }

  // --- Student Actions ---

  submitAnswer(answerId: string) {
    if (this.hasSubmitted() || this.phase() !== 'ACTIVE') return;

    const submission: Submission = {
      studentName: this.localStudentName(),
      answerId: answerId,
      timestamp: Date.now()
    };

    this.localSubmission.set(submission);
    this.hasSubmitted.set(true);

    this.channel.postMessage({
      type: 'SUBMIT_ANSWER',
      submission
    });
  }

  joinGame(name: string) {
    this.localStudentName.set(name);
  }
}
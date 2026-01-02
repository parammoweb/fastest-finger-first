import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService, GradeGroup, Question } from '../services/game.service';
import { GoogleGenAI, Type } from "@google/genai";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      <header class="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center">
        <div class="flex items-center gap-3">
          <a routerLink="/" class="text-indigo-200 hover:text-white transition-colors">← Home</a>
          <h1 class="text-xl font-bold">Teacher Dashboard</h1>
        </div>
        <div class="text-sm bg-indigo-800 px-3 py-1 rounded-full">
          Status: {{ game.phase() }}
        </div>
      </header>

      <main class="flex-grow p-6 max-w-5xl mx-auto w-full">
        
        <!-- SETUP PHASE -->
        @if (game.phase() === 'SETUP') {
          <div class="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Create New Quiz</h2>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Grade Group</label>
              <div class="grid grid-cols-3 gap-3">
                @for (g of gradeGroups; track g) {
                  <button 
                    (click)="selectedGroup.set(g)"
                    [class.ring-2]="selectedGroup() === g"
                    [class.ring-indigo-500]="selectedGroup() === g"
                    [class.bg-indigo-50]="selectedGroup() === g"
                    class="py-3 px-4 border rounded-lg hover:bg-gray-50 focus:outline-none transition-all font-medium text-gray-700">
                    Grade {{ g }}
                  </button>
                }
              </div>
            </div>

            <div class="flex justify-end">
              <button 
                (click)="generateQuestion()" 
                [disabled]="isGenerating() || !selectedGroup()"
                class="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (isGenerating()) {
                  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                } @else {
                  <span>✨ Generate Question with AI</span>
                }
              </button>
            </div>
            
            @if (generationError()) {
              <div class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
                {{ generationError() }}
              </div>
            }
          </div>
        }

        <!-- READY PHASE -->
        @if (game.phase() === 'READY') {
          <div class="bg-white rounded-xl shadow-lg p-8">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 class="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Question Preview</h3>
                <p class="text-lg text-gray-600 mt-1">Grade {{ game.currentQuestion()?.gradeGroup }}</p>
              </div>
              <button (click)="game.resetGame()" class="text-gray-400 hover:text-red-500">Cancel</button>
            </div>

            <h2 class="text-3xl font-bold text-gray-900 mb-8">{{ game.currentQuestion()?.text }}</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              @for (opt of game.currentQuestion()?.options; track opt.id) {
                <div 
                  [class.border-green-500]="opt.id === game.currentQuestion()?.correctAnswerId"
                  [class.bg-green-50]="opt.id === game.currentQuestion()?.correctAnswerId"
                  class="p-4 border-2 rounded-lg flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold">
                    {{ opt.id }}
                  </span>
                  <span class="font-medium">{{ opt.text }}</span>
                  @if (opt.id === game.currentQuestion()?.correctAnswerId) {
                    <span class="ml-auto text-green-600 font-bold">✔ Correct</span>
                  }
                </div>
              }
            </div>

            <div class="flex justify-center">
              <button 
                (click)="game.startGame()"
                class="bg-green-600 text-white px-12 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-green-700 transform hover:scale-105 transition-all">
                🚀 Start Game
              </button>
            </div>
          </div>
        }

        <!-- ACTIVE PHASE -->
        @if (game.phase() === 'ACTIVE') {
          <div class="text-center">
            <div class="inline-block bg-white rounded-full px-8 py-3 shadow-lg mb-8">
              <span class="text-5xl font-mono font-bold" 
                [class.text-red-600]="game.timeRemaining() < 10"
                [class.text-indigo-600]="game.timeRemaining() >= 10">
                {{ game.timeRemaining() }}s
              </span>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 class="text-2xl font-bold mb-4">{{ game.currentQuestion()?.text }}</h2>
              <p class="text-gray-500">Waiting for submissions...</p>
              
              <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div class="bg-blue-50 p-4 rounded-lg">
                   <div class="text-3xl font-bold text-blue-600">{{ getSubmissionCount('A') }}</div>
                   <div class="text-sm text-blue-800">Option A</div>
                 </div>
                 <div class="bg-blue-50 p-4 rounded-lg">
                   <div class="text-3xl font-bold text-blue-600">{{ getSubmissionCount('B') }}</div>
                   <div class="text-sm text-blue-800">Option B</div>
                 </div>
                 <div class="bg-blue-50 p-4 rounded-lg">
                   <div class="text-3xl font-bold text-blue-600">{{ getSubmissionCount('C') }}</div>
                   <div class="text-sm text-blue-800">Option C</div>
                 </div>
                 <div class="bg-blue-50 p-4 rounded-lg">
                   <div class="text-3xl font-bold text-blue-600">{{ getSubmissionCount('D') }}</div>
                   <div class="text-sm text-blue-800">Option D</div>
                 </div>
              </div>
            </div>

            <button 
              (click)="game.endGame()"
              class="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 shadow-md">
              Stop Game Now
            </button>
          </div>
        }

        <!-- ENDED PHASE (RESULTS) -->
        @if (game.phase() === 'ENDED') {
          <div class="max-w-4xl mx-auto">
             <div class="text-center mb-8">
               <h2 class="text-4xl font-extrabold text-gray-900 mb-2">🏆 Leaderboard</h2>
               <p class="text-gray-600">Correct Answer: <span class="font-bold text-green-600">{{ getCorrectAnswerText() }}</span></p>
             </div>

             <div class="bg-white rounded-xl shadow-xl overflow-hidden">
               <div class="overflow-x-auto">
                 <table class="w-full text-left">
                   <thead class="bg-gray-100 border-b">
                     <tr>
                       <th class="p-4 text-gray-600 font-semibold">Rank</th>
                       <th class="p-4 text-gray-600 font-semibold">Student Name</th>
                       <th class="p-4 text-gray-600 font-semibold text-right">Time (sec)</th>
                     </tr>
                   </thead>
                   <tbody class="divide-y">
                     @for (result of game.results(); track result.studentName; let i = $index) {
                       <tr class="hover:bg-gray-50 transition-colors" [class.bg-yellow-50]="i === 0">
                         <td class="p-4 font-bold">
                           @if (i === 0) { 🥇 }
                           @else if (i === 1) { 🥈 }
                           @else if (i === 2) { 🥉 }
                           @else { {{ i + 1 }} }
                         </td>
                         <td class="p-4 font-medium">{{ result.studentName }}</td>
                         <td class="p-4 text-right font-mono text-gray-500">
                           {{ ((result.timestamp - game.startTime()) / 1000).toFixed(3) }}s
                         </td>
                       </tr>
                     }
                     @if (game.results().length === 0) {
                       <tr>
                         <td colspan="3" class="p-8 text-center text-gray-500 italic">
                           No correct answers received within the time limit.
                         </td>
                       </tr>
                     }
                   </tbody>
                 </table>
               </div>
             </div>

             <div class="flex justify-center mt-8">
               <button 
                 (click)="game.resetGame()"
                 class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg">
                 Start New Game
               </button>
             </div>
          </div>
        }

      </main>
    </div>
  `
})
export class HostComponent {
  game = inject(GameService);
  
  gradeGroups: GradeGroup[] = ['1-2', '3-4', '5-6', '7-8', '9'];
  selectedGroup = signal<GradeGroup | null>(null);
  
  isGenerating = signal(false);
  generationError = signal<string | null>(null);

  getSubmissionCount(optionId: string): number {
    return this.game.submissions().filter(s => s.answerId === optionId).length;
  }

  getCorrectAnswerText(): string {
    const q = this.game.currentQuestion();
    if (!q) return '';
    return q.options.find(o => o.id === q.correctAnswerId)?.text || q.correctAnswerId;
  }

  async generateQuestion() {
    const group = this.selectedGroup();
    if (!group) return;
    
    this.isGenerating.set(true);
    this.generationError.set(null);

    try {
      const apiKey = process.env['API_KEY'];
      if (!apiKey) throw new Error('API Key missing');
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Generate a challenging multiple choice quiz question suitable for school grade ${group}. 
      Return strictly a JSON object with this schema:
      {
        "text": "The question string",
        "options": [
          {"id": "A", "text": "Option A"},
          {"id": "B", "text": "Option B"},
          {"id": "C", "text": "Option C"},
          {"id": "D", "text": "Option D"}
        ],
        "correctAnswerId": "A" (or B, C, D)
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING }
                  }
                }
              },
              correctAnswerId: { type: Type.STRING }
            }
          }
        }
      });
      
      const jsonText = response.text; // Fixed: using property instead of function call
      if (!jsonText) throw new Error('Empty response');

      const data = JSON.parse(jsonText);
      
      this.game.setQuestion({
        text: data.text,
        options: data.options,
        correctAnswerId: data.correctAnswerId,
        gradeGroup: group
      });

    } catch (err) {
      console.error(err);
      this.generationError.set('Failed to generate question. Please try again or check API Key.');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
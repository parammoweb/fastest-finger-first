import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      
      <!-- LOGO / HEADER -->
      <div class="absolute top-4 left-4">
        <a routerLink="/" class="text-indigo-600 font-bold hover:underline">← Exit</a>
      </div>

      <!-- LOGIN SCREEN -->
      @if (!game.localStudentName()) {
        <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-indigo-700">Join Quiz</h1>
            <p class="text-gray-500">Enter your name to start</p>
          </div>
          
          <input 
            #nameInput
            type="text" 
            placeholder="Your Name (e.g. Alice)" 
            class="w-full p-4 border-2 border-gray-200 rounded-xl mb-4 focus:border-indigo-500 focus:outline-none text-lg"
            (keyup.enter)="join(nameInput.value)"
          >
          
          <button 
            (click)="join(nameInput.value)"
            class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors">
            Join Game
          </button>
        </div>
      } @else {
        
        <!-- MAIN GAME AREA -->
        <div class="w-full max-w-lg">
          
          <!-- STATUS BAR -->
          <div class="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center">
            <span class="font-bold text-gray-700">👤 {{ game.localStudentName() }}</span>
            <span class="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">
              {{ game.phase() === 'ACTIVE' ? 'LIVE' : 'WAITING' }}
            </span>
          </div>

          <!-- WAITING FOR START -->
          @if (game.phase() === 'SETUP' || game.phase() === 'READY') {
            <div class="bg-white rounded-2xl shadow-lg p-10 text-center">
              <div class="animate-bounce text-6xl mb-4">⏳</div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Waiting for Host</h2>
              <p class="text-gray-500">The game will start soon...</p>
            </div>
          }

          <!-- ACTIVE GAME (QUESTION) -->
          @if (game.phase() === 'ACTIVE') {
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
              <!-- TIMER BAR -->
              <div class="h-2 bg-gray-100 w-full">
                <div class="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                     [style.width.%]="(game.timeRemaining() / 30) * 100"></div>
              </div>
              
              <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                  <span class="text-sm font-bold text-indigo-600 tracking-wider">QUESTION</span>
                  <span class="font-mono font-bold text-red-500">{{ game.timeRemaining() }}s</span>
                </div>
                
                <h3 class="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
                  {{ game.currentQuestion()?.text }}
                </h3>

                @if (!game.hasSubmitted()) {
                  <div class="grid grid-cols-1 gap-3">
                    @for (opt of game.currentQuestion()?.options; track opt.id) {
                      <button 
                        (click)="game.submitAnswer(opt.id)"
                        class="p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group flex items-center">
                        <span class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold mr-3 transition-colors">
                          {{ opt.id }}
                        </span>
                        <span class="font-medium text-gray-700 group-hover:text-indigo-900">{{ opt.text }}</span>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div class="text-4xl mb-2">🔒</div>
                    <h3 class="font-bold text-gray-800">Answer Locked!</h3>
                    <p class="text-gray-500 text-sm">Wait for the results...</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- RESULTS SCREEN -->
          @if (game.phase() === 'ENDED') {
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
              @if (getMyRank() > 0) {
                <div class="mb-6">
                  <div class="text-6xl mb-2">🎉</div>
                  <h2 class="text-3xl font-extrabold text-green-600 mb-1">Congratulations!</h2>
                  <p class="text-gray-600">You answered correctly.</p>
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                  <p class="text-sm text-yellow-800 uppercase font-bold tracking-widest mb-1">Your Rank</p>
                  <div class="text-5xl font-black text-yellow-600">#{{ getMyRank() }}</div>
                </div>
              } @else {
                 @if (didIAnswerCorrectly()) {
                   <!-- Correct but not top 30? Unlikely with 30 limit in demo, but possible in logic -->
                    <div class="mb-6">
                      <div class="text-6xl mb-2">👍</div>
                      <h2 class="text-2xl font-bold text-green-600">Correct!</h2>
                      <p class="text-gray-500">Good job, but you weren't in the fastest top 30 this time.</p>
                    </div>
                 } @else {
                    <div class="mb-6">
                      <div class="text-6xl mb-2">😢</div>
                      <h2 class="text-2xl font-bold text-red-500">Better luck next time</h2>
                      <p class="text-gray-500">That wasn't the correct answer.</p>
                    </div>
                 }
              }

              <div class="text-sm text-gray-400">Wait for the host to start the next game.</div>
            </div>
          }
          
        </div>
      }
    </div>
  `
})
export class StudentComponent {
  game = inject(GameService);

  join(name: string) {
    if (name.trim()) {
      this.game.joinGame(name.trim());
    }
  }

  getMyRank(): number {
    const name = this.game.localStudentName();
    const index = this.game.results().findIndex(r => r.studentName === name);
    return index !== -1 ? index + 1 : 0;
  }

  didIAnswerCorrectly(): boolean {
     // If user is in the results array, they are correct (since backend filters only correct).
     // However, to distinguish "Wrong" from "Correct but slow" (if we limited results to top 30), 
     // we assume if not in results, they are either wrong or too slow.
     // In this simple demo, 'results' contains only correct answers. 
     // We don't have a 'wrong answers' list in public state, so we infer from ranking for now.
     // Ideally, we'd check against the Question.correctAnswerId if we had access to it, 
     // but client might not want to know the answer easily via inspect element before end.
     // Since GameService syncs the question, we can check locally for UI feedback.
     
     const q = this.game.currentQuestion();
     const mySub = this.game.localSubmission();
     if (!q || !mySub) return false;
     return q.correctAnswerId === mySub.answerId;
  }
}
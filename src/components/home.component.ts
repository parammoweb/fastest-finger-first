import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
      <div class="max-w-md w-full bg-white text-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <h1 class="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          Fastest Finger First
        </h1>
        <p class="text-gray-500 mb-8">Real-time classroom quiz system</p>

        <div class="space-y-4">
          <a routerLink="/host" 
             class="block w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
            <span>👑</span> I am the Host (Teacher)
          </a>
          
          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <span class="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
            <div class="flex-grow border-t border-gray-300"></div>
          </div>

          <a routerLink="/student" 
             class="block w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
            <span>🎓</span> I am a Student
          </a>
        </div>
        
        <p class="mt-6 text-xs text-gray-400">
          Tip: Open "Host" in one tab and "Student" in other tabs to simulate the game on one device.
        </p>
      </div>
    </div>
  `
})
export class HomeComponent {}
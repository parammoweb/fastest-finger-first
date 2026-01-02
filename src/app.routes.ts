import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { HostComponent } from './components/host.component';
import { StudentComponent } from './components/student.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'host', component: HostComponent },
  { path: 'student', component: StudentComponent },
  { path: '**', redirectTo: '' }
];
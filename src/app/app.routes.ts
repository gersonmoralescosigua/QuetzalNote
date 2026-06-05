import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'editor', pathMatch: 'full' },
  { path: ':view', component: MainLayoutComponent },
  { path: '**', redirectTo: 'editor' },
];

// app.routes.ts — define las rutas de la app. Un solo layout maneja todas las vistas via signal.
import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'editor', pathMatch: 'full' },
  { path: ':view', component: MainLayoutComponent },
  { path: '**', redirectTo: 'editor' },
];

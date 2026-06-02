import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { NotesService } from '../services/notes.service';

/**
 * loadingInterceptor
 * Interceptor funcional HTTP (Angular 17+ functional interceptor pattern).
 *
 * Activa el loader global automáticamente en CADA request HTTP hacia Firebase
 * y lo desactiva cuando el request finaliza (éxito o error).
 *
 * Esto elimina la necesidad de manejar isLoading manualmente en cada servicio.
 * Por ahora está preparado pero NO registrado en app.config.ts hasta que
 * se complete la integración con el UiService de estado global.
 *
 * Para activarlo, agregar en app.config.ts:
 *   provideHttpClient(withInterceptors([loadingInterceptor]))
 *
 * Responsable: Isidro (core/interceptors/) — Blueprint §6
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const notesService = inject(NotesService);

  // Solo activar loader para requests a Firebase
  const isFirebaseRequest = req.url.includes('firebaseio.com');

  if (isFirebaseRequest) {
    notesService.isLoading.set(true);
  }

  return next(req).pipe(
    finalize(() => {
      if (isFirebaseRequest) {
        notesService.isLoading.set(false);
      }
    }),
  );
};

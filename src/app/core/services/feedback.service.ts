import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Feedback } from '../models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private http = inject(HttpClient);

  /**
   * Endpoint raíz del nodo "feedback" en Firebase Realtime Database.
   * Todos los registros se almacenan bajo /feedback/{pushId}.
   */
  private apiUrl = `${environment.firebaseUrl}feedback`;

  /**
   * Persiste un nuevo feedback en Firebase.
   * Firebase genera automáticamente un push key único y cronológico.
   *
   * @returns Observable con el ID (push key) asignado por Firebase.
   */
  submitFeedback(feedback: Omit<Feedback, 'id'>): Observable<string> {
    return this.http
      .post<{ name: string }>(`${this.apiUrl}.json`, feedback)
      .pipe(
        map((response) => response.name),
        catchError(this.handleError('enviar el feedback')),
      );
  }

  /**
   * Recupera todos los feedbacks almacenados.
   * Útil para un panel de administración futuro.
   * Ordenados del más reciente al más antiguo (por push key cronológico).
   */
  getFeedbacks(): Observable<Feedback[]> {
    return this.http
      .get<{ [key: string]: Feedback } | null>(`${this.apiUrl}.json`)
      .pipe(
        map((response) => {
          if (!response) return [];
          return Object.keys(response)
            .map((key) => ({ ...response[key], id: key }))
            .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        }),
        catchError(this.handleError('obtener los feedbacks')),
      );
  }

  /**
   * Recupera un feedback específico por ID.
   */
  getFeedbackById(id: string): Observable<Feedback> {
    return this.http
      .get<Feedback>(`${this.apiUrl}/${id}.json`)
      .pipe(
        map((feedback) => ({ ...feedback, id })),
        catchError(this.handleError('obtener el feedback')),
      );
  }

  /**
   * Actualiza el estado de un feedback (pendiente → revisado → atendido).
   * Para uso en panel de administración.
   */
  updateEstado(id: string, estado: Feedback['estado']): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/${id}.json`, { estado })
      .pipe(catchError(this.handleError('actualizar el estado del feedback')));
  }

  // ── Manejo centralizado de errores (mismo patrón que NotesService) ─────────
  private handleError(accion: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      let mensaje = `No se pudo ${accion}.`;

      if (error.status === 0) {
        mensaje = `No se pudo ${accion}. Verifica tu conexión a internet.`;
      } else if (error.status === 401 || error.status === 403) {
        mensaje = `No se pudo ${accion}. Permiso denegado en Firebase.`;
      } else if (error.status === 404) {
        mensaje = `No se pudo ${accion}. Recurso no encontrado.`;
      } else if (error.status >= 500) {
        mensaje = `No se pudo ${accion}. Firebase no está disponible.`;
      }

      console.error(`[FeedbackService] ${accion}:`, error);
      return throwError(() => new Error(mensaje));
    };
  }
}

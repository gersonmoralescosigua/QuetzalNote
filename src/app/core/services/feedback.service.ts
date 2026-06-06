// feedback.service.ts — persistencia de feedback de usuarios en Firebase Realtime Database.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Feedback } from '../models/feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.firebaseUrl}feedback`;

  submitFeedback(feedback: Omit<Feedback, 'id'>): Observable<string> {
    return this.http.post<{ name: string }>(`${this.apiUrl}.json`, feedback).pipe(
      map((response) => response.name),
      catchError(this.handleError('enviar el feedback')),
    );
  }

  getFeedbacks(): Observable<Feedback[]> {
    return this.http.get<{ [key: string]: Feedback } | null>(`${this.apiUrl}.json`).pipe(
      map((response) => {
        if (!response) return [];
        return Object.keys(response)
          .map((key) => ({ ...response[key], id: key }))
          .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      }),
      catchError(this.handleError('obtener los feedbacks')),
    );
  }

  getFeedbackById(id: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.apiUrl}/${id}.json`).pipe(
      map((feedback) => ({ ...feedback, id })),
      catchError(this.handleError('obtener el feedback')),
    );
  }

  updateEstado(id: string, estado: Feedback['estado']): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/${id}.json`, { estado })
      .pipe(catchError(this.handleError('actualizar el estado del feedback')));
  }

  private handleError(accion: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      let mensaje = `No se pudo ${accion}.`;
      if (error.status === 0) mensaje = `No se pudo ${accion}. Verifica tu conexión a internet.`;
      else if (error.status === 401 || error.status === 403) mensaje = `No se pudo ${accion}. Permiso denegado en Firebase.`;
      else if (error.status === 404) mensaje = `No se pudo ${accion}. Recurso no encontrado.`;
      else if (error.status >= 500) mensaje = `No se pudo ${accion}. Firebase no está disponible.`;
      console.error(`[FeedbackService] ${accion}:`, error);
      return throwError(() => new Error(mensaje));
    };
  }
}

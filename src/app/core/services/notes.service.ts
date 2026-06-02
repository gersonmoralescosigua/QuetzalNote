import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Note } from '../models/note.model';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.firebaseUrl}notas`;

  selectedNote = signal<Note | null>(null);
  reloadTrigger = signal(0);
  isLoading = signal(false);
  searchQuery = signal('');
  quillInstance = signal<any>(null);

  setQuillInstance(quill: any) {
    this.quillInstance.set(quill);
  }

  selectNote(note: Note | null) {
    this.selectedNote.set(note);
    // Persiste el ID para restaurarlo en la próxima sesión/recarga
    if (note?.id) {
      localStorage.setItem('qn_lastNoteId', note.id);
    } else {
      localStorage.removeItem('qn_lastNoteId');
    }
  }

  getLastNoteId(): string | null {
    return localStorage.getItem('qn_lastNoteId');
  }

  triggerReload() {
    this.reloadTrigger.update(v => v + 1);
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }

  getNotes(): Observable<Note[]> {
    return this.http.get<{ [key: string]: Note } | null>(`${this.apiUrl}.json`).pipe(
      map((response) => {
        if (!response) return [];
        const notes = Object.keys(response).map((key) => ({
          ...response[key],
          id: key,
        }));
        // Más recientes primero — los IDs de Firebase push() son cronológicos,
        // el generado más tarde es lexicográficamente mayor.
        return notes.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      }),
      catchError(this.handleError('cargar las notas')),
    );
  }

  getNoteById(id: string): Observable<Note> {
    return this.http.get<Note>(`${this.apiUrl}/${id}.json`).pipe(
      map((note) => ({ ...note, id })),
      catchError(this.handleError('cargar la nota')),
    );
  }

  createNote(note: Omit<Note, 'id'>): Observable<string> {
    const today = new Date().toISOString().split('T')[0];
    const newNote: Omit<Note, 'id'> = {
      ...note,
      fechaCreacion: today,
      fechaActualizacion: today,
    };
    return this.http.post<{ name: string }>(`${this.apiUrl}.json`, newNote).pipe(
      map((response) => response.name),
      catchError(this.handleError('crear la nota')),
    );
  }

  updateNote(id: string, note: Omit<Note, 'id'>): Observable<Note> {
    const today = new Date().toISOString().split('T')[0];
    const updatedNote: Omit<Note, 'id'> = {
      ...note,
      fechaActualizacion: today,
    };
    return this.http.put<Note>(`${this.apiUrl}/${id}.json`, updatedNote).pipe(
      map((response) => ({ ...response, id })),
      catchError(this.handleError('actualizar la nota')),
    );
  }

  deleteNote(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}.json`)
      .pipe(catchError(this.handleError('eliminar la nota')));
  }

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

      console.error(error);
      return throwError(() => new Error(mensaje));
    };
  }
}

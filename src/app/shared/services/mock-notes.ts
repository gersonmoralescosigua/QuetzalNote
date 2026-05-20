import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Note } from '../../core/models/note.model';

@Injectable({ providedIn: 'root' })
export class MockNotesService {
  private notesSubject = new BehaviorSubject<Note[]>([
    {
      id: '1',
      titulo: 'Bienvenido a Quetzal Note',
      contenido: '<p>Esta es tu primera nota. Edítala o crea una nueva.</p>',
      pinned: false,
      archived: false,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    },
    {
      id: '2',
      titulo: 'Tareas pendientes',
      contenido:
        '<ul><li>Terminar el layout</li><li>Conectar con Firebase</li><li>Añadir dark mode</li></ul>',
      pinned: false,
      archived: false,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    },
  ]);

  private selectedNoteSubject = new BehaviorSubject<Note | null>(null);

  getNotes(): Observable<Note[]> {
    return this.notesSubject.asObservable();
  }

  getSelectedNote(): Observable<Note | null> {
    return this.selectedNoteSubject.asObservable();
  }

  selectNote(id: string): void {
    const note = this.notesSubject.getValue().find((n) => n.id === id);
    this.selectedNoteSubject.next(note || null);
  }

  createNote(): void {
    const newNote: Note = {
      id: Date.now().toString(),
      titulo: 'Nota sin título',
      contenido: '<p>Escribe aquí...</p>',
      pinned: false,
      archived: false,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    };
    const currentNotes = this.notesSubject.getValue();
    this.notesSubject.next([newNote, ...currentNotes]);
    this.selectedNoteSubject.next(newNote);
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const currentNotes = this.notesSubject.getValue();
    const updatedNotes = currentNotes.map((note) =>
      note.id === id ? { ...note, ...updates, fechaActualizacion: new Date().toISOString() } : note,
    );
    this.notesSubject.next(updatedNotes);

    const selected = this.selectedNoteSubject.getValue();
    if (selected?.id === id) {
      this.selectedNoteSubject.next(updatedNotes.find((n) => n.id === id) || null);
    }
  }
}

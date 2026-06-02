import { Injectable, signal, computed } from '@angular/core';
import { Note } from '../../../core/models/note.model';

/**
 * NotesStateService
 * Gestiona el estado local del módulo de notas.
 * Separa el estado de UI (nota seleccionada, búsqueda, loading)
 * del acceso a datos (NotesService en core/).
 *
 * Actualmente los signals de estado están en NotesService para simplificar
 * el bootstrap del proyecto. Esta clase es el lugar correcto según la
 * arquitectura del Blueprint (features/notes/state/) y será el destino
 * de la migración progresiva conforme el proyecto madure.
 *
 * Responsable: Isidro (features/notes/state/) — Blueprint §7
 */
@Injectable({
  providedIn: 'root',
})
export class NotesStateService {

  // ── Estado selección ──────────────────────────────────────────────────────

  /** Nota actualmente seleccionada y visible en el editor. */
  readonly selectedNote = signal<Note | null>(null);

  /** Consulta de búsqueda activa en la sidebar. */
  readonly searchQuery = signal<string>('');

  /** Contador de triggers para forzar recarga de la lista de notas. */
  readonly reloadTrigger = signal<number>(0);

  /** Indica si hay una operación Firebase en curso. */
  readonly isLoading = signal<boolean>(false);

  // ── Computed ──────────────────────────────────────────────────────────────

  /** True si hay una nota seleccionada con ID válido. */
  readonly hasSelectedNote = computed(() => !!this.selectedNote()?.id);

  /** Texto normalizado para filtrado en sidebar. */
  readonly searchQueryLower = computed(() =>
    this.searchQuery().toLowerCase().trim()
  );

  // ── Acciones ──────────────────────────────────────────────────────────────

  selectNote(note: Note | null): void {
    this.selectedNote.set(note);
    if (note?.id) {
      localStorage.setItem('qn_lastNoteId', note.id);
    } else {
      localStorage.removeItem('qn_lastNoteId');
    }
  }

  triggerReload(): void {
    this.reloadTrigger.update(v => v + 1);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  getLastNoteId(): string | null {
    return localStorage.getItem('qn_lastNoteId');
  }
}

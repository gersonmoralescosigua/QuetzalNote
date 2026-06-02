import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { UiService } from '../../services/ui.service';
import { NotesService } from '../../../core/services/notes.service';
import { Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  ui = inject(UiService);
  notesService = inject(NotesService);

  isMoreMenuOpen = signal(false);
  private allNotes = signal<Note[]>([]);
  /** Evita restaurar más de una vez (solo en el primer loadNotes tras arrancar) */
  private restoredOnce = false;

  notes = computed(() => {
    const query = this.notesService.searchQuery().toLowerCase();
    return this.allNotes().filter(n => n.titulo.toLowerCase().includes(query));
  });

  constructor() {
    effect(() => {
      this.notesService.reloadTrigger();
      this.loadNotes();
    });
  }

  private loadNotes() {
    this.notesService.isLoading.set(true);
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        const active = notes.filter(n => !n.deleted);
        this.allNotes.set(active);
        this.notesService.isLoading.set(false);

        // Solo en el primer arranque de la app
        if (!this.restoredOnce) {
          this.restoredOnce = true;

          if (active.length === 0) {
            // Sin notas → crear una nota vacía por defecto y abrirla
            this.createNote();
          } else {
            // Hay notas → restaurar la última que estaba abierta
            const lastId = this.notesService.getLastNoteId();
            if (lastId && !this.notesService.selectedNote()) {
              const saved = active.find(n => n.id === lastId);
              if (saved) {
                this.selectNote(saved);
              }
            }
          }
        }
      },
      error: () => {
        this.notesService.isLoading.set(false);
      }
    });
  }

  selectNote(note: Note) {
    this.notesService.getNoteById(note.id!).subscribe({
      next: (freshNote) => {
        this.notesService.selectNote(freshNote);
        this.ui.currentView.set('editor');
        this.ui.isLoginOpen.set(false);
      }
    });
  }

  /** Devuelve true si la nota no tiene contenido real (está vacía/sin usar) */
  private isNoteEmpty(note: Note): boolean {
    const raw = (note.contenido || '').replace(/<[^>]*>/g, '').trim();
    return raw === '';
  }

  createNote() {
    // Si la nota actual ya está abierta y vacía, no crear otra — solo enfocarla
    const current = this.notesService.selectedNote();
    if (current && this.isNoteEmpty(current)) {
      this.ui.currentView.set('editor');
      this.ui.isLoginOpen.set(false);
      return;
    }

    this.notesService.createNote({
      titulo: 'Untitled Document',
      contenido: '',
      pinned: false,
      archived: false,
      fechaCreacion: '',
      fechaActualizacion: ''
    }).subscribe({
      next: (newId) => {
        this.notesService.getNoteById(newId).subscribe({
          next: (note) => {
            this.loadNotes();
            this.notesService.selectNote(note);
            this.ui.currentView.set('editor');
            this.ui.isLoginOpen.set(false);
          },
          error: () => this.loadNotes()
        });
      },
      error: () => {}
    });
  }

  deleteNote(note: Note) {
    Swal.fire({
      title: '<span class="text-[18px] font-bold">Delete Note</span>',
      html: '<span class="text-[14px] text-gray-500">Are you sure you want to delete this note?</span>',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#f3f4f6',
      confirmButtonText: 'Delete',
      cancelButtonText: '<span class="text-gray-700">Cancel</span>',
      width: '400px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton: 'px-5 py-2 rounded-md font-medium',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.notesService.updateNote(note.id!, {
          titulo: note.titulo,
          contenido: note.contenido,
          pinned: note.pinned ?? false,
          archived: note.archived ?? false,
          deleted: true,
          fechaCreacion: note.fechaCreacion,
          fechaActualizacion: note.fechaActualizacion
        }).subscribe({
          next: () => {
            if (this.notesService.selectedNote()?.id === note.id) {
              this.notesService.selectNote(null);
            }
            this.loadNotes();
          },
          error: () => {}
        });
      }
    });
  }

  toggleMoreMenu() {
    this.isMoreMenuOpen.update((v) => !v);
    if (!this.ui.isSidebarOpen() && this.isMoreMenuOpen()) {
      this.ui.toggleSidebar();
    }
  }
}

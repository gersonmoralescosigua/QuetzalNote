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

  notes = computed(() => {
    const query = this.notesService.searchQuery().toLowerCase();
    return this.allNotes().filter(n => n.titulo.toLowerCase().includes(query));
  });

  constructor() {
    effect(() => {
      this.notesService.reloadTrigger();
      this.loadNotes();
    }, { allowSignalWrites: true });
  }

  private loadNotes() {
    this.notesService.isLoading.set(true);
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        this.allNotes.set(notes.filter(n => !n.deleted));
        this.notesService.isLoading.set(false);
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

  createNote() {
    this.notesService.createNote({
      titulo: 'New Note',
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

import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TopbarComponent } from '../../shared/components/topbar/topbar';
import { EditorToolbar } from '../../shared/components/editor-toolbar/editor-toolbar';
import { NoteEditorComponent } from '../../features/notes/components/note-editor/note-editor';
import { UiService } from '../../shared/services/ui.service';
import { NotesService } from '../../core/services/notes.service';
import { Loader } from '../../shared/components/loader/loader';
import { EmptyNotes } from '../../shared/components/empty-notes/empty-notes';
import { Note } from '../../core/models/note.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, EditorToolbar, NoteEditorComponent, Loader, EmptyNotes],
  templateUrl: './main-layout.html',
})
export class MainLayoutComponent {
  ui = inject(UiService);
  notesService = inject(NotesService);

  trashedNotes = signal<Note[]>([]);

  constructor() {
    effect(() => {
      if (this.ui.isTrashOpen()) {
        this.loadTrashedNotes();
      }
    });
  }

  private loadTrashedNotes() {
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        this.trashedNotes.set(notes.filter(n => n.deleted));
      },
      error: () => {}
    });
  }

  restoreNote(note: Note) {
    this.notesService.updateNote(note.id!, {
      titulo: note.titulo,
      contenido: note.contenido,
      pinned: note.pinned ?? false,
      archived: note.archived ?? false,
      deleted: false,
      fechaCreacion: note.fechaCreacion,
      fechaActualizacion: note.fechaActualizacion
    }).subscribe({
      next: () => {
        this.loadTrashedNotes();
        this.notesService.triggerReload();
      },
      error: () => {}
    });
  }

  permanentDeleteNote(note: Note) {
    Swal.fire({
      title: '<span class="text-[18px] font-bold">Delete Permanently</span>',
      html: '<span class="text-[14px] text-gray-500">This action cannot be undone.</span>',
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
        this.notesService.deleteNote(note.id!).subscribe({
          next: () => this.loadTrashedNotes(),
          error: () => {}
        });
      }
    });
  }
}

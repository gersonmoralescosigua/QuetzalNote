import { Component, inject, OnInit, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { NotesService } from '../../../core/services/notes.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  ui = inject(UiService);
  notesService = inject(NotesService);
  isDarkMode = signal(false);

  // LÓGICA: Control de los menús desplegables del usuario
  isUserMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

  // LÓGICA: Referencia directa al input del título.
  // Se manipula el DOM directamente para evitar que cualquier binding
  // reactivo resetee el texto mientras el usuario está escribiendo.
  @ViewChild('titleInput') private titleInput!: ElementRef<HTMLInputElement>;
  private currentNoteId: string | null = null;

  constructor() {
    // Solo actualiza el valor del input cuando se selecciona una NOTA DIFERENTE.
    // No resetea el texto si la misma nota fue guardada (mismo id).
    effect(() => {
      const note = this.notesService.selectedNote();
      if (note?.id !== this.currentNoteId) {
        this.currentNoteId = note?.id || null;
        if (this.titleInput?.nativeElement) {
          this.titleInput.nativeElement.value = note?.titulo || '';
        }
      }
    });
  }

  ngOnInit() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    }
  }

  toggleTheme() {
    this.isDarkMode.update((v) => !v);

    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  keepTitleFocus() {
    const quill = this.notesService.quillInstance();
    if (quill) {
      quill.blur();
    }
  }

  updateTitle() {
    const note = this.notesService.selectedNote();
    if (!note?.id) return;
    const newTitle = (this.titleInput.nativeElement.value || '').trim() || 'New Note';
    // Mostrar el valor ya limpio en el input
    this.titleInput.nativeElement.value = newTitle;
    // Si el título no cambió, no hacer llamada a Firebase
    if (newTitle === note.titulo) return;
    this.notesService.updateNote(note.id, {
      titulo: newTitle,
      contenido: note.contenido,
      pinned: note.pinned ?? false,
      archived: note.archived ?? false,
      fechaCreacion: note.fechaCreacion,
      fechaActualizacion: ''
    }).subscribe({
      next: (updated) => {
        this.notesService.selectNote(updated);
        this.notesService.triggerReload();
      }
    });
  }

  setSearchQuery(event: Event) {
    const input = event.target as HTMLInputElement;
    this.notesService.setSearchQuery(input.value);
  }

  toggleUserMenu() {
    this.isUserMenuOpen.update((v) => !v);
    if (!this.isUserMenuOpen()) {
      this.isLanguageMenuOpen.set(false);
    }
  }
}

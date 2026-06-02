import { Component, inject, OnInit, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { NotesService } from '../../../core/services/notes.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  ui          = inject(UiService);
  notesService = inject(NotesService);
  authService = inject(AuthService);
  isDarkMode  = signal(false);

  // LÓGICA: Control de los menús desplegables del usuario
  isUserMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

  // LÓGICA: Referencia directa al input del título.
  // Se manipula el DOM directamente para evitar que cualquier binding
  // reactivo resetee el texto mientras el usuario está escribiendo.
  @ViewChild('titleInput') private titleInput!: ElementRef<HTMLInputElement>;
  private currentNoteId: string | null = null;
  private lastKnownTitle = '';

  constructor() {
    effect(() => {
      const note = this.notesService.selectedNote();
      const newTitle = note?.titulo || '';
      const differentNote = note?.id !== this.currentNoteId;
      const titleChanged = newTitle !== this.lastKnownTitle;

      if (differentNote) {
        // Nota diferente → siempre actualizar
        this.currentNoteId = note?.id || null;
        this.lastKnownTitle = newTitle;
        if (this.titleInput?.nativeElement) {
          this.titleInput.nativeElement.value = newTitle;
        }
      } else if (titleChanged) {
        // Misma nota pero el título cambió (auto-título desde el editor)
        // Solo actualizar si el usuario NO está editando el input en este momento
        this.lastKnownTitle = newTitle;
        if (document.activeElement !== this.titleInput?.nativeElement) {
          if (this.titleInput?.nativeElement) {
            this.titleInput.nativeElement.value = newTitle;
          }
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

  /** Abre la pantalla de login */
  openLogin(): void {
    this.ui.isLoginOpen.set(true);
    this.isUserMenuOpen.set(false);
  }

  /** Cierra sesión vía AuthService */
  signOut(): void {
    this.authService.signOut();
    this.isUserMenuOpen.set(false);
  }
}

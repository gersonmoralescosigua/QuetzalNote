import {
  Component,
  inject,
  OnInit,
  signal,
  effect,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';
import { NotesService } from '../../../core/services/notes.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService, Language } from '../../services/i18n.service';

/**
 * TopbarComponent
 * ─────────────────────────────────────────────────────────────────────────────
 * Barra superior de navegación de QuetzalNote.
 * Cambia su contenido según la vista activa: editor, pdf o paraphraser.
 *
 * Responsabilidades:
 *  - Editar el título de la nota activa
 *  - Mostrar el indicador de guardado (Saving / Saved)
 *  - Abrir el modal de búsqueda (Ctrl+K)
 *  - Toggle del modo oscuro
 *  - Menú de usuario (login / logout / idioma)
 *
 * Responsable: Gerson (shared/components/topbar/)
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  // ── Servicios ─────────────────────────────────────────────────────────────
  ui = inject(UiService);
  notesService = inject(NotesService);
  authService = inject(AuthService);
  i18n = inject(I18nService);

  // ── Signals de UI ─────────────────────────────────────────────────────────
  isDarkMode = signal(false);
  isUserMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

  // ── Referencias al DOM ────────────────────────────────────────────────────
  @ViewChild('titleInput') private titleInput!: ElementRef<HTMLInputElement>;

  // ── Estado interno ────────────────────────────────────────────────────────
  private currentNoteId = '';
  private lastKnownTitle = '';

  // ==================== ATAJO DE TECLADO Ctrl+K ====================
  @HostListener('window:keydown', ['$event'])
  openSearch(event: KeyboardEvent): void {
    // Ctrl+K (Windows/Linux) o Cmd+K (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.ui.isSearchModalOpen.set(true);
    }
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  constructor() {
    // LÓGICA: Cuando la nota seleccionada cambia, sincronizar el input del título.
    // Solo actualizamos si la nota es diferente (por ID) o si el título cambió
    // mientras el input no tiene el foco (para no interrumpir la edición manual).
    effect(() => {
      const note = this.notesService.selectedNote();
      const newTitle = note?.titulo || '';
      const diffNote = note?.id !== this.currentNoteId;
      const diffTitle = newTitle !== this.lastKnownTitle;

      if (diffNote) {
        this.currentNoteId = note?.id || '';
        this.lastKnownTitle = newTitle;
        if (this.titleInput?.nativeElement) {
          this.titleInput.nativeElement.value = newTitle;
        }
      } else if (diffTitle) {
        this.lastKnownTitle = newTitle;
        // Solo actualizar si el input NO está siendo editado por el usuario
        if (document.activeElement !== this.titleInput?.nativeElement) {
          if (this.titleInput?.nativeElement) {
            this.titleInput.nativeElement.value = newTitle;
          }
        }
      }
    });
  }

  ngOnInit(): void {
    // Restaurar preferencia de tema guardada en localStorage
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    }
  }

  // ── Tema claro / oscuro ───────────────────────────────────────────────────

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  // ── Título de la nota ─────────────────────────────────────────────────────

  /** Guarda el título de la nota cuando el input pierde el foco o se presiona Enter */
  updateTitle(): void {
    const note = this.notesService.selectedNote();
    if (!note?.id) return;

    const newTitle = (this.titleInput.nativeElement.value || '').trim() || 'New Note';
    this.titleInput.nativeElement.value = newTitle;
    if (newTitle === note.titulo) return; // Sin cambios → no guardar

    this.ui.isSaving.set(true);
    this.ui.lastSaved.set(false);

    this.notesService
      .updateNote(note.id, {
        titulo: newTitle,
        contenido: note.contenido,
        pinned: note.pinned ?? false,
        archived: note.archived ?? false,
        fechaCreacion: note.fechaCreacion,
        fechaActualizacion: '',
      })
      .subscribe({
        next: (updated) => {
          this.notesService.selectNote(updated);
          this.notesService.triggerReload(); // Actualiza el sidebar con el nuevo título
          this.ui.isSaving.set(false);
          this.ui.lastSaved.set(true);
        },
        error: () => {
          this.ui.isSaving.set(false);
        },
      });
  }

  // ── Menú de usuario ───────────────────────────────────────────────────────

  /** Alterna la visibilidad del menú de usuario. Cierra el submenú de idiomas si aplica. */
  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
    if (!this.isUserMenuOpen()) {
      this.isLanguageMenuOpen.set(false);
    }
  }

  /** Abre la pantalla de login y cierra el menú */
  openLogin(): void {
    this.ui.currentView.set('login');
    this.isUserMenuOpen.set(false);
    this.isLanguageMenuOpen.set(false);
  }

  /** Cierra la sesión del usuario y cierra el menú */
  signOut(): void {
    this.authService.signOut();
    this.isUserMenuOpen.set(false);
  }

  // ── Idioma ────────────────────────────────────────────────────────────────

  /**
   * Cambia el idioma activo usando I18nService.
   * El cambio es reactivo: todos los componentes que usan i18n.t() se actualizan.
   */
  setLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
    this.isLanguageMenuOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────

  setSearchQuery(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.notesService.setSearchQuery(input.value);
  }
}

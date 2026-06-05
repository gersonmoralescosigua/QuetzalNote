// topbar.ts — barra superior adaptativa: cambia su contenido según la vista activa.
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

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  ui = inject(UiService);
  notesService = inject(NotesService);
  authService = inject(AuthService);
  i18n = inject(I18nService);

  isDarkMode = signal(false);
  isUserMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

  // referencias al dom
  @ViewChild('titleInput') private titleInput!: ElementRef<HTMLInputElement>;

  // estado interno
  private currentNoteId = '';
  private lastKnownTitle = '';

  @HostListener('window:keydown', ['$event'])
  openSearch(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.ui.isSearchModalOpen.set(true);
    }
  }

  constructor() {
    // Sincroniza el input del título cuando cambia la nota seleccionada.
    // Si la nota es distinta actualizamos siempre; si es la misma solo cuando
    // el input no tiene el foco, para no pisar lo que el usuario está editando.
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
        if (document.activeElement !== this.titleInput?.nativeElement) {
          if (this.titleInput?.nativeElement) {
            this.titleInput.nativeElement.value = newTitle;
          }
        }
      }
    });
  }

  ngOnInit(): void {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    }

    // Captura en fase capture para que los keydown del input de título
    // no lleguen a Quill y causen comportamientos inesperados.
    document.addEventListener(
      'keydown',
      (e) => {
        if (document.activeElement === this.titleInput?.nativeElement) {
          e.stopPropagation();
        }
      },
      true,
    ); // true = capture phase, antes de que Quill lo vea
  }

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

  // Guarda el título al salir del input o al presionar Enter
  updateTitle(): void {
    const note = this.notesService.selectedNote();
    if (!note?.id) return;

    const newTitle = (this.titleInput.nativeElement.value || '').trim() || 'New Note';
    this.titleInput.nativeElement.value = newTitle;
    if (newTitle === note.titulo) return;

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
          this.notesService.triggerReload();
          this.ui.isSaving.set(false);
          this.ui.lastSaved.set(true);
        },
        error: () => {
          this.ui.isSaving.set(false);
        },
      });
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
    if (!this.isUserMenuOpen()) {
      this.isLanguageMenuOpen.set(false);
    }
  }

  openLogin(): void {
    this.ui.currentView.set('login');
    this.isUserMenuOpen.set(false);
    this.isLanguageMenuOpen.set(false);
  }

  signOut(): void {
    this.authService.signOut();
    this.isUserMenuOpen.set(false);
  }

  setLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
    this.isLanguageMenuOpen.set(false);
    this.isUserMenuOpen.set(false);
  }
}

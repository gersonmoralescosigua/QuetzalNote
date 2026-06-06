import {
  Component,
  inject,
  signal,
  effect,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { QuillModule, ContentChange } from 'ngx-quill';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TopbarComponent } from '../../shared/components/topbar/topbar';
import { EditorToolbar } from '../../shared/components/editor-toolbar/editor-toolbar';
import { NoteEditorComponent } from '../../features/notes/components/note-editor/note-editor';
import { UiService } from '../../shared/services/ui.service';
import { NotesService } from '../../core/services/notes.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { PdfService } from '../../core/services/pdf.service';
import { ParaphraserService } from '../../core/services/paraphraser.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../shared/services/i18n.service';
import { Loader } from '../../shared/components/loader/loader';
import { EmptyNotes } from '../../shared/components/empty-notes/empty-notes';
import { Note } from '../../core/models/note.model';
import { FeedbackRating } from '../../core/models/feedback.model';
import Swal from 'sweetalert2';

/**
 * MainLayoutComponent
 * ─────────────────────────────────────────────────────────────────────────────
 * Esqueleto visual principal de la aplicación QuetzalNote.
 * Responsable: Gerson (layout, UX, distribución).
 *
 * Contiene:
 *  - Sidebar lateral
 *  - Topbar superior
 *  - Área central (editor / PDF / paraphraser)
 *  - Modales: Feedback, Login, Trash, All Notes, Search
 *
 * Blueprint §6: "UI Components: Solo visualización, diseño, eventos."
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    QuillModule, // ← Necesario para la vista PDF con editor Quill
    SidebarComponent,
    TopbarComponent,
    EditorToolbar,
    NoteEditorComponent,
    Loader,
    EmptyNotes,
  ],
  templateUrl: './main-layout.html',
})
export class MainLayoutComponent {
  // ── Servicios ─────────────────────────────────────────────────────────────
  ui = inject(UiService);
  notesService = inject(NotesService);
  feedbackService = inject(FeedbackService);
  authService = inject(AuthService);
  i18n = inject(I18nService);
  private pdfSvc = inject(PdfService);
  private parasSvc = inject(ParaphraserService);
  private router = inject(Router);

  // ── Trash / All Notes ─────────────────────────────────────────────────────
  trashedNotes = signal<Note[]>([]);
  allModalNotes = signal<Note[]>([]);

  // ── Sort del modal All Notes ───────────────────────────────────────────────
  /** Modo de ordenación activo: recent | a→z | z→a */
  currentSort = signal<'recent' | 'az' | 'za'>('recent');
  // ── Estado para el menú de tres puntos (All Notes) ──────────────────────────
  activeNoteMenu = signal<string | null>(null);

  // ── Auth (refs de formulario email/password) ──────────────────────────────
  @ViewChild('emailInput') private emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') private passwordInputRef!: ElementRef<HTMLInputElement>;
  showPassword = signal(false);

  // ── Feedback ──────────────────────────────────────────────────────────────
  @ViewChild('feedbackTextarea') private feedbackTextareaRef!: ElementRef<HTMLTextAreaElement>;
  isFeedbackSubmitting = signal(false);

  // ── PDF Editor (instancia Quill de la vista PDF) ──────────────────────────
  /** Instancia del editor Quill de la vista PDF */
  private pdfQuillInstance: any = null;
  /** ¿Hay texto en el editor PDF? */
  pdfHasText = signal(false);
  /** Número de palabras del editor PDF */
  pdfWordCount = signal(0);
  /** Número de caracteres del editor PDF */
  pdfCharCount = signal(0);
  /** Módulos para el editor Quill de PDF */
  pdfEditorModules = {
    toolbar: false,
    history: { delay: 1000, maxStack: 100, userOnly: true },
  };
  /** True mientras se genera el PDF */
  isPdfConverting = signal(false);

  // ── Paraphraser ───────────────────────────────────────────────────────────
  @ViewChild('paraphraserInput') private paraphraserInputRef!: ElementRef<HTMLTextAreaElement>;
  paraphraserOutput = signal('');
  isParaphrasing = signal(false);
  paraphraserCopied = signal(false);

  constructor() {
    const validViews = ['editor', 'pdf', 'paraphraser', 'contact', 'login'] as const;
    type ValidView = typeof validViews[number];

    // ── URL → signal: usa NavigationEnd para leer la URL real (evita snapshot stale) ──
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const path = ((e as NavigationEnd).urlAfterRedirects || (e as NavigationEnd).url)
          .split('/')[1] as ValidView;
        if (validViews.includes(path) && this.ui.currentView() !== path) {
          this.ui.currentView.set(path);
        }
      });

    // ── signal → URL: navega cuando el signal cambia desde cualquier componente ──
    effect(() => {
      const view = this.ui.currentView();
      const currentPath = this.router.url.split('/')[1];
      if (currentPath !== view) {
        this.router.navigate(['/', view]);
      }
    });

    // ── Efectos de UI ─────────────────────────────────────────────────────────
    effect(() => {
      if (this.ui.isTrashOpen()) {
        this.loadTrashedNotes();
      }
      if (this.ui.isSearchModalOpen()) {
        this.loadAllModalNotes();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUSCADOR AVANZADO "ALL NOTES" (Ctrl+K)
  // ══════════════════════════════════════════════════════════════════════════

  private loadAllModalNotes(): void {
    this.notesService.getNotes().subscribe({
      next: (notes) => this.allModalNotes.set(notes.filter((n) => !n.deleted)),
      error: () => {},
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.notesService.setSearchQuery(val);
  }

  /**
   * Retorna las notas filtradas por búsqueda Y ordenadas según currentSort.
   * Los modos de sort son: recent (orden Firebase), az (A→Z), za (Z→A).
   */
  modalFilteredNotes(): Note[] {
    const query = this.notesService.searchQuery()?.toLowerCase() || '';
    let notes = this.allModalNotes();

    if (query) {
      notes = notes.filter(
        (n: Note) =>
          n.titulo?.toLowerCase().includes(query) || n.contenido?.toLowerCase().includes(query),
      );
    }

    // LÓGICA: Ordenar según el modo activo
    const sort = this.currentSort();
    if (sort === 'az') {
      return [...notes].sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
    } else if (sort === 'za') {
      return [...notes].sort((a, b) => (b.titulo || '').localeCompare(a.titulo || ''));
    }
    // 'recent' — orden cronológico de Firebase (ID lexicográfico descendente)
    return notes;
  }

  /** Cicla entre los 3 modos de sort: recent → az → za → recent */
  cycleSort(): void {
    const order = ['recent', 'az', 'za'] as const;
    const idx = order.indexOf(this.currentSort());
    this.currentSort.set(order[(idx + 1) % order.length]);
  }

  /** Retorna el label del sort actual para mostrar en el botón */
  sortLabel(): string {
    const map: Record<string, string> = { recent: 'Recent', az: 'A → Z', za: 'Z → A' };
    return map[this.currentSort()];
  }

  selectNoteFromModal(note: Note): void {
    this.notesService.selectNote(note);
    this.closeSearchModal();
    this.ui.currentView.set('editor');
  }

  /** Cierra el modal "All Notes" (Ctrl+K) y limpia el filtro de búsqueda */
  closeSearchModal(): void {
    this.ui.isSearchModalOpen.set(false);
    this.notesService.setSearchQuery('');
  }

  // ── Menú de tres puntos (Rename / Remove) en All Notes ──────────────────────
  toggleNoteMenu(noteId?: string): void {
    if (!noteId) return;
    if (this.activeNoteMenu() === noteId) {
      this.activeNoteMenu.set(null);
    } else {
      this.activeNoteMenu.set(noteId);
    }
  }

  async renameNoteFromModal(note: Note): Promise<void> {
    this.activeNoteMenu.set(null);
    const { value: newTitle } = await Swal.fire({
      title: 'Rename Note',
      input: 'text',
      inputLabel: 'New title',
      inputValue: note.titulo,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#18639c',
      inputValidator: (value) => {
        if (!value || value.trim() === '') return 'Title cannot be empty';
        return null;
      },
    });
    if (newTitle && newTitle.trim() !== note.titulo) {
      // Actualizar título en Firebase
      const updatedNote = {
        ...note,
        titulo: newTitle.trim(),
        fechaActualizacion: new Date().toISOString().split('T')[0],
      };
      this.notesService.updateNote(note.id!, updatedNote).subscribe({
        next: (updated) => {
          // Actualizar lista local
          const updatedList = this.allModalNotes().map((n) => (n.id === updated.id ? updated : n));
          this.allModalNotes.set(updatedList);
          // Si era la nota seleccionada, actualizar en el editor
          if (this.notesService.selectedNote()?.id === note.id) {
            this.notesService.selectNote(updated);
          }
          this.notesService.triggerReload(); // refrescar sidebar
          Swal.fire({ title: 'Renamed!', icon: 'success', timer: 1500, showConfirmButton: false });
        },
        error: () => Swal.fire({ title: 'Error', text: 'Could not rename note', icon: 'error' }),
      });
    }
  }

  async removeNoteFromModal(note: Note): Promise<void> {
    this.activeNoteMenu.set(null);
    const result = await Swal.fire({
      title: 'Move to Trash',
      text: `Are you sure you want to move "${note.titulo}" to trash?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, move',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ff4d4f',
    });
    if (result.isConfirmed) {
      const updatedNote = {
        ...note,
        deleted: true,
        fechaActualizacion: new Date().toISOString().split('T')[0],
      };
      this.notesService.updateNote(note.id!, updatedNote).subscribe({
        next: () => {
          // Remover de la lista local
          this.allModalNotes.set(this.allModalNotes().filter((n) => n.id !== note.id));
          // Si era la nota seleccionada, limpiar selección
          if (this.notesService.selectedNote()?.id === note.id) {
            this.notesService.selectNote(null);
          }
          this.notesService.triggerReload();
          Swal.fire({
            title: 'Moved to trash',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: () => Swal.fire({ title: 'Error', text: 'Could not move note', icon: 'error' }),
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH — Google Sign-In + Email/Password
  // ══════════════════════════════════════════════════════════════════════════

  signInWithEmailPassword(): void {
    const email = this.emailInputRef?.nativeElement?.value?.trim() || '';
    const password = this.passwordInputRef?.nativeElement?.value || '';

    if (!email || !password) {
      this.showAlert('Campos requeridos', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    this.authService.signInWithEmail(email, password);

    const checkInterval = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        clearInterval(checkInterval);
        this.ui.currentView.set('editor');
      } else if (this.authService.authError()) {
        clearInterval(checkInterval);
        this.showAlert('Error de inicio de sesión', this.authService.authError()!);
        this.authService.authError.set(null);
      }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 15000);
  }

  signInWithGoogle(): void {
    this.authService.initGoogleSignIn();
    this.authService.triggerGooglePrompt();

    const checkInterval = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        clearInterval(checkInterval);
        this.ui.currentView.set('editor');
      }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 15000);
  }

  signOut(): void {
    this.authService.signOut();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEEDBACK
  // ══════════════════════════════════════════════════════════════════════════

  selectRating(rating: FeedbackRating): void {
    this.ui.selectedRating.set(rating);
    this.ui.feedbackStep.set(2);
  }

  submitFeedback(): void {
    const rating = this.ui.selectedRating();
    const mensaje = (this.feedbackTextareaRef?.nativeElement?.value || '').trim();

    if (!rating) {
      this.showAlert('Select a rating', 'Please select how you feel before sending.');
      return;
    }
    if (!mensaje) {
      this.showAlert('Empty message', 'Please write a message before sending.');
      return;
    }

    this.isFeedbackSubmitting.set(true);

    this.feedbackService
      .submitFeedback({
        rating,
        mensaje,
        fechaCreacion: new Date().toISOString(),
        agencia: this.ui.currentView(),
        usuarioId: this.authService.currentUser()?.uid ?? 'anonymous',
        estado: 'pendiente',
      })
      .subscribe({
        next: (id) => {
          this.isFeedbackSubmitting.set(false);
          console.log(`[Feedback] Guardado con ID: ${id}`);
          this.ui.closeFeedback();
          Swal.fire({
            title: '<span class="text-[16px] font-bold">Thank you!</span>',
            html: '<span class="text-[14px] text-gray-500">Your feedback has been submitted.</span>',
            confirmButtonColor: '#18639c',
            confirmButtonText: 'OK',
            width: '360px',
            timer: 2500,
            timerProgressBar: true,
            customClass: {
              popup: 'rounded-xl shadow-lg border border-gray-100',
              confirmButton: 'px-5 py-2 rounded-md font-medium',
            },
          });
        },
        error: (err: Error) => {
          this.isFeedbackSubmitting.set(false);
          this.showAlert('Error', err.message);
        },
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRASH — Papelera
  // ══════════════════════════════════════════════════════════════════════════

  private loadTrashedNotes(): void {
    this.notesService.getNotes().subscribe({
      next: (notes) => this.trashedNotes.set(notes.filter((n) => n.deleted)),
      error: () => {},
    });
  }

  restoreNote(note: Note): void {
    this.notesService
      .updateNote(note.id!, {
        titulo: note.titulo,
        contenido: note.contenido,
        pinned: note.pinned ?? false,
        archived: note.archived ?? false,
        deleted: false,
        fechaCreacion: note.fechaCreacion,
        fechaActualizacion: note.fechaActualizacion,
      })
      .subscribe({
        next: () => {
          this.loadTrashedNotes();
          this.notesService.triggerReload();
        },
        error: () => {},
      });
  }

  permanentDeleteNote(note: Note): void {
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
          error: () => {},
        });
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEXT TO PDF — Vista PDF con editor Quill completo
  // ══════════════════════════════════════════════════════════════════════════

  /** Callback cuando el editor Quill de PDF está listo */
  onPdfEditorCreated(quill: any): void {
    this.pdfQuillInstance = quill;
    // LÓGICA: Compartimos la misma instancia de Quill con el EditorToolbar
    // para que el toolbar funcione también en la vista PDF.
    this.notesService.setQuillInstance(quill);
    // Forzar actualización inicial para que pdfHasText se ponga false si está vacío
    setTimeout(() => {
      const text = this.pdfQuillInstance.getText().trim();
      this.pdfHasText.set(text.length > 0);
      this.pdfCharCount.set(text.length);
      this.pdfWordCount.set(text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0);
    }, 50);
  }

  /** Actualiza los contadores de palabras y caracteres del editor PDF */
  onPdfContentChanged(event: ContentChange): void {
    const text = event.text?.trim() || '';
    this.pdfHasText.set(text.length > 0);
    this.pdfCharCount.set(text.length);
    this.pdfWordCount.set(text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0);
  }

  /** Convierte el contenido del editor PDF a PDF y lo descarga */
  convertToPDF(): void {
    const html = this.pdfQuillInstance?.root?.innerHTML || '';
    const text = this.pdfQuillInstance?.getText()?.trim() || '';

    if (!text) {
      this.showAlert('No content', 'Please enter or paste text before converting.');
      return;
    }

    this.isPdfConverting.set(true);
    try {
      // Usar convertHtmlToPdf para preservar el formato del editor
      this.pdfSvc.convertHtmlToPdf(html, 'document');
    } catch (err: any) {
      if (err?.message === 'NO_POPUP') {
        this.showAlert(
          'Popup bloqueado',
          'Por favor permite ventanas emergentes para este sitio y vuelve a intentarlo.',
        );
      } else {
        this.showAlert('Error', 'Could not generate the PDF. Please try again.');
      }
    } finally {
      this.isPdfConverting.set(false);
    }
  }

  /**
   * Carga un documento de muestra muy completo en el editor PDF,
   * demostrando todas las capacidades del toolbar (negrita, listas,
   * tablas, checklist, código, colores, alineaciones, etc.)
   */
  loadRichSampleDocument(): void {
    if (!this.pdfQuillInstance) return;

    const richHtml = `
    <h1>The Art of Lorem Ipsum: A Complete Showcase</h1>
    <p>Welcome to this comprehensive demonstration of rich text editing. <strong>Lorem ipsum dolor sit amet</strong>, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>

    <h2>INTRODUCTION TO RICH FORMATTING</h2>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. You can combine <strong>bold</strong> and <em>italic</em> together, add <s>strikethrough text</s>, or <span style="background-color: #ffff00;">highlight important passages</span>. Technical writers often use <code>inline code</code> snippets like <code>userName</code> or <code>API_KEY</code>.</p>

    <h2>A QUOTE FROM ANCIENT WISDOM</h2>
    <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit. The quick brown fox jumps over the lazy dog, demonstrating that every letter of the alphabet can coexist peacefully in a single sentence — much like ideas in a well-crafted document.</blockquote>

    <h2>LISTS AND ORGANIZATION</h2>
    <h3>Unordered List</h3>
    <ul>
      <li>Set up peripatetic and omnis iste natus</li>
      <li>Error sit voluptatem accusantium doloremque
        <ul>
          <li>Nested item: laudantium totam rem aperiam</li>
          <li>Deep nesting example
            <ul>
              <li>Third level: ab illo inventore veritatis</li>
              <li>Third level: et quasi architecto</li>
            </ul>
          </li>
        </ul>
      </li>
      <li>Beatae vitae dicta sunt explicabo</li>
    </ul>

    <h3>Ordered List</h3>
    <ol>
      <li>First, gather all necessary materials</li>
      <li>Next, review the documentation thoroughly
        <ol>
          <li>Read the introduction section</li>
          <li>Study the advanced examples</li>
          <li>Practice with sample code</li>
        </ol>
      </li>
      <li>Then, begin implementation</li>
    </ol>

    <h3>Checklist / Task List</h3>
    <ul>
      <li data-list="unchecked">Set up the Lexical editor instance</li>
      <li data-list="unchecked">Configure the node types and plugins</li>
      <li data-list="checked">Add custom formatting options</li>
      <li data-list="checked">Implement collaborative editing features</li>
      <li data-list="unchecked">Deploy to production environment</li>
    </ul>

    <h2>TABLES FOR STRUCTURED DATA</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr><th style="border: 1px solid #ccc; padding: 8px;">Feature</th><th style="border: 1px solid #ccc; padding: 8px;">Description</th><th style="border: 1px solid #ccc; padding: 8px;">Status</th><th style="border: 1px solid #ccc; padding: 8px;">Priority</th></tr>
      </thead>
      <tbody>
        <tr><td style="border: 1px solid #ccc; padding: 8px;">Rich Text</td><td style="border: 1px solid #ccc; padding: 8px;">Bold, italic, underline</td><td style="border: 1px solid #ccc; padding: 8px;">Complete</td><td style="border: 1px solid #ccc; padding: 8px;">High</td></tr>
        <tr><td style="border: 1px solid #ccc; padding: 8px;">Tables</td><td style="border: 1px solid #ccc; padding: 8px;">Structured data presentation</td><td style="border: 1px solid #ccc; padding: 8px;">Complete</td><td style="border: 1px solid #ccc; padding: 8px;">High</td></tr>
        <tr><td style="border: 1px solid #ccc; padding: 8px;">Code Blocks</td><td style="border: 1px solid #ccc; padding: 8px;">Syntax-highlighted code snippets</td><td style="border: 1px solid #ccc; padding: 8px;">Complete</td><td style="border: 1px solid #ccc; padding: 8px;">Medium</td></tr>
        <tr><td style="border: 1px solid #ccc; padding: 8px;">Collaboration</td><td style="border: 1px solid #ccc; padding: 8px;">Real-time multi-user editing</td><td style="border: 1px solid #ccc; padding: 8px;">In Progress</td><td style="border: 1px solid #ccc; padding: 8px;">Medium</td></tr>
        <tr><td style="border: 1px solid #ccc; padding: 8px;">Export</td><td style="border: 1px solid #ccc; padding: 8px;">PDF and DOCX export options</td><td style="border: 1px solid #ccc; padding: 8px;">Planned</td><td style="border: 1px solid #ccc; padding: 8px;">Low</td></tr>
      </tbody>
    </table>

    <h2>CODE EXAMPLES</h2>
    <pre class="ql-syntax">function greet() {
  console.log("Hello, QuetzalNote!");
}</pre>

    <h2>TEXT ALIGNMENT EXAMPLES</h2>
    <p style="text-align: left;">Left-aligned: Lorem ipsum dolor sit amet.</p>
    <p style="text-align: center;">Center-aligned: Ut enim ad minim veniam.</p>
    <p style="text-align: right;">Right-aligned: Duis aute irure dolor.</p>
    <p style="text-align: justify;">Justified: Excepteur sint occaecat cupidatat non proident.</p>

    <h2>DIFFERENT COLORED TEXT</h2>
    <p><span style="color: #e74c3c;">Critical information in red</span>, <span style="color: #3498db;">informational notes in blue</span>, or <span style="color: #2ecc71;">success messages in green</span>.</p>

    <h2>FINAL THOUGHTS</h2>
    <p>This sample document demonstrates the breadth of features available in QuetzalNote.</p>
    <p><em>End of Sample Document</em></p>
  `;

    this.pdfQuillInstance.clipboard.dangerouslyPasteHTML(richHtml);
    // Forzar la actualización de contadores (aunque onPdfContentChanged ya se dispara al pegar)
    setTimeout(() => {
      const text = this.pdfQuillInstance.getText().trim();
      this.pdfHasText.set(text.length > 0);
      this.pdfCharCount.set(text.length);
      this.pdfWordCount.set(text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0);
    }, 50);
  }

  /** Abre un .docx y lo importa al editor PDF */
  uploadDocForPdf(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !this.pdfQuillInstance) return;
      try {
        const html = await this.pdfSvc.extractHtmlFromDocx(file);
        this.pdfQuillInstance.clipboard.dangerouslyPasteHTML(html);
      } catch {
        Swal.fire({
          title: 'Error',
          text: 'Could not read the file.',
          icon: 'error',
          confirmButtonColor: '#18639c',
          width: '360px',
        });
      }
    };
    input.click();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARAPHRASER
  // ══════════════════════════════════════════════════════════════════════════

  paraphrase(): void {
    const text = this.paraphraserInputRef?.nativeElement?.value?.trim() || '';
    if (!text) return;

    this.isParaphrasing.set(true);
    this.paraphraserOutput.set('');

    setTimeout(() => {
      const result = this.parasSvc.paraphrase(text);
      this.paraphraserOutput.set(result);
      this.isParaphrasing.set(false);
    }, 600);
  }

  copyParaphraserOutput(): void {
    const output = this.paraphraserOutput();
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      this.paraphraserCopied.set(true);
      setTimeout(() => this.paraphraserCopied.set(false), 2000);
    });
  }

  useInEditor(): void {
    const output = this.paraphraserOutput();
    if (!output) return;
    const quill = this.notesService.quillInstance();
    if (!quill) {
      this.showAlert('No note open', 'Open a note first to use the paraphrased text.');
      return;
    }
    const pos = quill.getLength() > 1 ? quill.getLength() - 1 : 0;
    quill.insertText(pos, '\n' + output);
    this.ui.currentView.set('editor');
  }

  clearParaphraser(): void {
    if (this.paraphraserInputRef?.nativeElement) {
      this.paraphraserInputRef.nativeElement.value = '';
    }
    this.paraphraserOutput.set('');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ══════════════════════════════════════════════════════════════════════════

  private showAlert(title: string, message: string): void {
    Swal.fire({
      title: `<span class="text-[16px] font-bold">${title}</span>`,
      html: `<span class="text-[14px] text-gray-500">${message}</span>`,
      confirmButtonColor: '#18639c',
      confirmButtonText: 'OK',
      width: '360px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
      },
    });
  }

  @HostListener('document:click')
  closeNoteMenu() {
    this.activeNoteMenu.set(null);
  }
}

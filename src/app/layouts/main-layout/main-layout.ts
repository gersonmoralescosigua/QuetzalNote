import { Component, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Loader } from '../../shared/components/loader/loader';
import { EmptyNotes } from '../../shared/components/empty-notes/empty-notes';
import { Note } from '../../core/models/note.model';
import { FeedbackRating } from '../../core/models/feedback.model';
import Swal from 'sweetalert2';

/**
 * MainLayoutComponent
 * Esqueleto visual principal de la aplicación.
 * Responsable: Gerson (layout, UX, distribución).
 * Isidro solo conecta servicios de lógica — sin lógica de negocio inline.
 *
 * Blueprint §6: "UI Components: Solo visualización, diseño, eventos."
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
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
  ui               = inject(UiService);
  notesService     = inject(NotesService);
  feedbackService  = inject(FeedbackService);
  authService      = inject(AuthService);
  private pdfSvc   = inject(PdfService);
  private parasSvc = inject(ParaphraserService);

  // ── Trash ─────────────────────────────────────────────────────────────────
  trashedNotes = signal<Note[]>([]);

  // ── Auth (email/password form refs) ──────────────────────────────────────
  @ViewChild('emailInput')    private emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') private passwordInputRef!: ElementRef<HTMLInputElement>;
  showPassword = signal(false);

  // ── Feedback ──────────────────────────────────────────────────────────────
  @ViewChild('feedbackTextarea') private feedbackTextareaRef!: ElementRef<HTMLTextAreaElement>;
  isFeedbackSubmitting = signal(false);

  // ── Text to PDF ───────────────────────────────────────────────────────────
  @ViewChild('pdfTextarea') private pdfTextareaRef!: ElementRef<HTMLTextAreaElement>;
  isPdfConverting = signal(false);

  // ── Paraphraser ───────────────────────────────────────────────────────────
  @ViewChild('paraphraserInput') private paraphraserInputRef!: ElementRef<HTMLTextAreaElement>;
  paraphraserOutput  = signal('');
  isParaphrasing     = signal(false);
  paraphraserCopied  = signal(false);

  constructor() {
    effect(() => {
      if (this.ui.isTrashOpen()) {
        this.loadTrashedNotes();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH — Google Sign-In vía AuthService + GIS + Firebase REST API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicia sesión con email y contraseña.
   * Lee los valores del formulario y delega la autenticación a AuthService.
   * Cierra la vista de login al completarse exitosamente.
   */
  signInWithEmailPassword(): void {
    const email    = this.emailInputRef?.nativeElement?.value?.trim() || '';
    const password = this.passwordInputRef?.nativeElement?.value || '';

    if (!email || !password) {
      this.showAlert('Campos requeridos', 'Por favor ingresa tu email y contraseña.');
      return;
    }

    this.authService.signInWithEmail(email, password);

    // Observar cuando el login se complete para cerrar la vista o mostrar error
    const checkInterval = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        clearInterval(checkInterval);
        this.ui.isLoginOpen.set(false);
      } else if (this.authService.authError()) {
        clearInterval(checkInterval);
        this.showAlert('Error de inicio de sesión', this.authService.authError()!);
        this.authService.authError.set(null);
      }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 15000);
  }

  /**
   * Inicia el flujo de Google Sign-In.
   * Inicializa GIS (si aún no se hizo) y dispara el selector de cuenta de Google.
   * El resultado llega al AuthService mediante el callback interno.
   * Al completarse exitosamente, cierra la vista de login.
   */
  signInWithGoogle(): void {
    this.authService.initGoogleSignIn();
    this.authService.triggerGooglePrompt();

    // Observar cuando el login se complete para cerrar la vista
    const checkInterval = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        clearInterval(checkInterval);
        this.ui.isLoginOpen.set(false);
      }
      // Limpiar si el usuario cerró el prompt sin autenticarse (5s timeout)
    }, 300);

    // Cancelar el polling si no hubo login en 15 segundos
    setTimeout(() => clearInterval(checkInterval), 15000);
  }

  /**
   * Cierra la sesión del usuario actual.
   * Limpia el estado en AuthService y localStorage.
   */
  signOut(): void {
    this.authService.signOut();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK — lógica Firebase delegada a FeedbackService
  // ═══════════════════════════════════════════════════════════════════════════

  /** Registra el rating elegido y avanza al paso 2 del modal. */
  selectRating(rating: FeedbackRating): void {
    this.ui.selectedRating.set(rating);
    this.ui.feedbackStep.set(2);
  }

  /**
   * Valida los datos del modal y persiste el feedback en Firebase.
   * Toda la lógica HTTP vive en FeedbackService.
   */
  submitFeedback(): void {
    const rating  = this.ui.selectedRating();
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

    this.feedbackService.submitFeedback({
      rating,
      mensaje,
      fechaCreacion: new Date().toISOString(),
      agencia:   this.ui.currentView(),
      usuarioId: this.authService.currentUser()?.uid ?? 'anonymous',
      estado:    'pendiente',
    }).subscribe({
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
          customClass: { popup: 'rounded-xl shadow-lg border border-gray-100', confirmButton: 'px-5 py-2 rounded-md font-medium' },
        });
      },
      error: (err: Error) => {
        this.isFeedbackSubmitting.set(false);
        this.showAlert('Error', err.message);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRASH — lógica CRUD delegada a NotesService
  // ═══════════════════════════════════════════════════════════════════════════

  private loadTrashedNotes(): void {
    this.notesService.getNotes().subscribe({
      next: (notes) => this.trashedNotes.set(notes.filter(n => n.deleted)),
      error: () => {},
    });
  }

  restoreNote(note: Note): void {
    this.notesService.updateNote(note.id!, {
      titulo:              note.titulo,
      contenido:           note.contenido,
      pinned:              note.pinned ?? false,
      archived:            note.archived ?? false,
      deleted:             false,
      fechaCreacion:       note.fechaCreacion,
      fechaActualizacion:  note.fechaActualizacion,
    }).subscribe({
      next: () => { this.loadTrashedNotes(); this.notesService.triggerReload(); },
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
        popup:         'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton:  'px-5 py-2 rounded-md font-medium',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT TO PDF — lógica de conversión delegada a PdfService
  // ═══════════════════════════════════════════════════════════════════════════

  /** Lee el textarea y delega la conversión a PdfService. */
  convertToPDF(): void {
    const text = this.pdfTextareaRef?.nativeElement?.value || '';
    this.isPdfConverting.set(true);
    try {
      this.pdfSvc.convertTextToPdf(text);
    } catch (err: any) {
      if (err?.message === 'NO_CONTENT') {
        this.showAlert('No content', 'Please enter or paste text before converting.');
      } else {
        Swal.fire({ title: 'Error', text: 'Could not generate the PDF. Please try again.', icon: 'error', confirmButtonColor: '#18639c', width: '360px' });
      }
    } finally {
      this.isPdfConverting.set(false);
    }
  }

  /** Carga texto de muestra en el textarea (desde PdfService). */
  loadSampleDocument(): void {
    if (!this.pdfTextareaRef?.nativeElement) return;
    this.pdfTextareaRef.nativeElement.value = this.pdfSvc.getSampleText();
  }

  /** Abre selector de archivo .docx y extrae el texto (PdfService). */
  uploadDocForPdf(): void {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !this.pdfTextareaRef?.nativeElement) return;
      try {
        const text = await this.pdfSvc.extractTextFromDocx(file);
        this.pdfTextareaRef.nativeElement.value = text;
      } catch {
        Swal.fire({ title: 'Error', text: 'Could not read the file.', icon: 'error', confirmButtonColor: '#18639c', width: '360px' });
      }
    };
    input.click();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAPHRASER — lógica de sustitución delegada a ParaphraserService
  // ═══════════════════════════════════════════════════════════════════════════

  /** Obtiene el texto del input y delega el parafraseo a ParaphraserService. */
  paraphrase(): void {
    const text = this.paraphraserInputRef?.nativeElement?.value?.trim() || '';
    if (!text) return;

    this.isParaphrasing.set(true);
    this.paraphraserOutput.set('');

    // Timeout para feedback visual de procesamiento
    setTimeout(() => {
      const result = this.parasSvc.paraphrase(text);
      this.paraphraserOutput.set(result);
      this.isParaphrasing.set(false);
    }, 600);
  }

  /** Copia el resultado al portapapeles. */
  copyParaphraserOutput(): void {
    const output = this.paraphraserOutput();
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      this.paraphraserCopied.set(true);
      setTimeout(() => this.paraphraserCopied.set(false), 2000);
    });
  }

  /** Inserta el texto parafraseado al final de la nota activa. */
  useInEditor(): void {
    const output = this.paraphraserOutput();
    if (!output) return;
    const quill = this.notesService.quillInstance();
    if (!quill) {
      Swal.fire({ title: 'No note open', text: 'Open a note first.', confirmButtonColor: '#18639c', width: '340px' });
      return;
    }
    const pos = quill.getLength() > 1 ? quill.getLength() - 1 : 0;
    quill.insertText(pos, '\n' + output);
    this.ui.currentView.set('editor');
  }

  /** Limpia el input y el output del paraphraser. */
  clearParaphraser(): void {
    if (this.paraphraserInputRef?.nativeElement) {
      this.paraphraserInputRef.nativeElement.value = '';
    }
    this.paraphraserOutput.set('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Muestra un SweetAlert2 de aviso estándar. */
  private showAlert(title: string, message: string): void {
    Swal.fire({
      title: `<span class="text-[16px] font-bold">${title}</span>`,
      html:  `<span class="text-[14px] text-gray-500">${message}</span>`,
      confirmButtonColor: '#18639c',
      confirmButtonText:  'OK',
      width: '360px',
      customClass: {
        popup:         'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
      },
    });
  }
}

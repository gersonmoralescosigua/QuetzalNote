import { Injectable, signal } from '@angular/core';
import { FeedbackRating } from '../../core/models/feedback.model';

/**
 * ui.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio central de estado de UI para QuetzalNote.
 * Centraliza todos los signals de visibilidad de paneles, modales y vistas.
 * Ningún componente debe guardar este tipo de estado local — todo pasa por aquí.
 *
 * Pattern: Signal → template reactivo (sin subscriptions manuales)
 *
 * Responsable: Gerson (shared/services/) — Blueprint §6
 */
@Injectable({
  providedIn: 'root',
})
export class UiService {
  // ── Navegación / Layout ───────────────────────────────────────────────────

  /** True = sidebar expandido (260px), False = colapsado (68px) */
  isSidebarOpen = signal(true);

  /** Vista activa en el panel central */
  currentView = signal<'editor' | 'pdf' | 'paraphraser' | 'contact' | 'login'>('editor');

  // ── Modales ───────────────────────────────────────────────────────────────

  /** Controla la visibilidad del modal de Feedback */
  isFeedbackOpen = signal(false);

  /** Controla si se muestra la pantalla de Login en el área principal */
  isLoginOpen = signal(false);

  /** Controla la visibilidad del panel de papelera (flotante sobre el layout) */
  isTrashOpen = signal(false);

  /** Controla la visibilidad del modal de búsqueda avanzada (Ctrl+K) */
  isSearchModalOpen = signal(false);

  // ── Guardado ──────────────────────────────────────────────────────────────

  /** True mientras Firebase procesa una escritura (auto-guardado) */
  isSaving = signal(false);

  /** True durante ~2s después de que Firebase confirma el guardado */
  lastSaved = signal(false);

  // ── Feedback ──────────────────────────────────────────────────────────────

  /** Paso actual del modal de Feedback: 1 = Caritas, 2 = Mensaje de texto */
  feedbackStep = signal<1 | 2>(1);

  /** Rating seleccionado en el paso 1. Se limpia al cerrar el modal. */
  selectedRating = signal<FeedbackRating | null>(null);

  // ── Acciones ──────────────────────────────────────────────────────────────

  /** Alterna el estado abierto/cerrado del sidebar */
  toggleSidebar(): void {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  /**
   * Cierra el modal de Feedback y reinicia su estado interno
   * (pasos y rating) tras un pequeño retraso para no cortar la animación de salida.
   */
  closeFeedback(): void {
    this.isFeedbackOpen.set(false);
    setTimeout(() => {
      this.feedbackStep.set(1);
      this.selectedRating.set(null);
    }, 300);
  }
}

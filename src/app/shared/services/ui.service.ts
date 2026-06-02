import { Injectable, signal } from '@angular/core';
import { FeedbackRating } from '../../core/models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  // Signal que controla si el sidebar está expandido (true) o colapsado (false)
  isSidebarOpen = signal(true);
  // Controla la visibilidad del modal de Feedback
  isFeedbackOpen = signal(false);
  // Controla si se muestra la pantalla de Login en el área principal
  isLoginOpen = signal(false);
  // Controla la pantalla activa dentro del tablero principal
  currentView = signal<'editor' | 'pdf' | 'paraphraser'>('editor');
  // Controla la visibilidad de la papelera
  isTrashOpen = signal(false);

  // Controla el paso actual del modal de Feedback (1 = Caritas, 2 = Texto)
  feedbackStep = signal<1 | 2>(1);

  // Rating seleccionado en el paso 1. Se limpia al cerrar el modal.
  selectedRating = signal<FeedbackRating | null>(null);

  toggleSidebar() {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  // Cierra el modal y lo reinicia al paso 1 tras un breve retraso
  closeFeedback() {
    this.isFeedbackOpen.set(false);
    setTimeout(() => {
      this.feedbackStep.set(1);
      this.selectedRating.set(null);
    }, 300);
  }
}

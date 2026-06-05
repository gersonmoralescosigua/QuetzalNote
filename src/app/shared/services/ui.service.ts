// ui.service.ts — estado global de la UI. Signals para vistas, modales y guardado.
import { Injectable, signal } from '@angular/core';
import { FeedbackRating } from '../../core/models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  // navegación
  isSidebarOpen = signal(true);
  currentView = signal<'editor' | 'pdf' | 'paraphraser' | 'contact' | 'login'>('editor');

  // modales
  isFeedbackOpen = signal(false);
  isTrashOpen = signal(false);
  isSearchModalOpen = signal(false);

  // indicador de guardado en topbar
  isSaving = signal(false);
  lastSaved = signal(false);

  // estado del modal de feedback
  feedbackStep = signal<1 | 2>(1);
  selectedRating = signal<FeedbackRating | null>(null);

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  // Cierra el modal y resetea su estado con delay para no cortar la animación
  closeFeedback(): void {
    this.isFeedbackOpen.set(false);
    setTimeout(() => {
      this.feedbackStep.set(1);
      this.selectedRating.set(null);
    }, 300);
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  ui = inject(UiService);

  // Controla si el submenú de "More" está desplegado
  isMoreMenuOpen = signal(false);

  toggleMoreMenu() {
    this.isMoreMenuOpen.update((v) => !v);

    // Mejora UX: Abre el sidebar completo si estaba colapsado al intentar abrir "More"
    if (!this.ui.isSidebarOpen() && this.isMoreMenuOpen()) {
      this.ui.toggleSidebar();
    }
  }
}

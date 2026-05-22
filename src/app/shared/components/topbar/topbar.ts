import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  ui = inject(UiService);
  isDarkMode = signal(false);

  // LÓGICA: Control de los menús desplegables del usuario
  isUserMenuOpen = signal(false);
  isLanguageMenuOpen = signal(false);

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

  // LÓGICA: Función para abrir/cerrar el menú
  toggleUserMenu() {
    this.isUserMenuOpen.update((v) => !v);
    if (!this.isUserMenuOpen()) {
      this.isLanguageMenuOpen.set(false); // Cierra el submenú de idiomas si el principal se cierra
    }
  }
}

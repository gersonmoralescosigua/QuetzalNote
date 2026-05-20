import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- 1. Importamos CommonModule
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule], // <-- 2. Lo agregamos al arreglo de imports
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit {
  ui = inject(UiService);
  isDarkMode = signal(false);

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
}

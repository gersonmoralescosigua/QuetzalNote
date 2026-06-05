import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Bloquear eventos de teclado en elementos con clase 'stop-quill-events'
document.addEventListener(
  'keydown',
  (e) => {
    if ((e.target as HTMLElement).closest('.stop-quill-events')) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      // No llamamos a preventDefault() para permitir escritura normal
    }
  },
  true, // fase de captura, antes que Quill
);
document.addEventListener(
  'keyup',
  (e) => {
    if ((e.target as HTMLElement).closest('.stop-quill-events')) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener(
  'keypress',
  (e) => {
    if ((e.target as HTMLElement).closest('.stop-quill-events')) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  },
  true,
);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

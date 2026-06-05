import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { UiService } from '../../services/ui.service';
import { NotesService } from '../../../core/services/notes.service';
import { Note } from '../../../core/models/note.model';
import { I18nService } from '../../services/i18n.service';

// Componente que representa la barra lateral (sidebar) de la aplicación.
// Muestra la lista de notas, botón para nueva nota, herramientas adicionales,
// menú "More" con enlaces, y gestiona la selección, eliminación y restauración de notas.
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  // Inyección de servicios
  ui = inject(UiService); // Servicio de estado de UI (sidebar abierta/cerrada, vistas, etc.)
  notesService = inject(NotesService); // Servicio de gestión de notas (CRUD, estado)
  i18n = inject(I18nService);

  // Señales internas del componente
  isMoreMenuOpen = signal(false); // Controla si el submenú "More" está desplegado
  private allNotes = signal<Note[]>([]); // Almacena todas las notas activas (no eliminadas)

  /** Evita restaurar más de una vez (solo en el primer loadNotes tras arrancar) */
  private restoredOnce = false; // Flag para ejecutar la restauración de última nota solo al inicio

  // Señal computada que filtra las notas según el texto de búsqueda (obtenido del servicio)
  notes = computed(() => {
    const query = this.notesService.searchQuery().toLowerCase();
    const filtered = this.allNotes().filter((n) => n.titulo.toLowerCase().includes(query));
    // Mostrar solo las primeras 6 notas en el sidebar
    return filtered.slice(0, 7);
  });

  constructor() {
    // Efecto que se ejecuta cada vez que se dispara reloadTrigger (por ejemplo, tras crear/eliminar/actualizar)
    effect(() => {
      this.notesService.reloadTrigger(); // Lee el trigger para que el efecto dependa de él
      this.loadNotes(); // Vuelve a cargar las notas desde Firebase
    });
  }

  // Carga las notas activas desde Firebase y gestiona la primera inicialización
  private loadNotes() {
    this.notesService.isLoading.set(true); // Muestra el spinner de carga
    this.notesService.getNotes().subscribe({
      next: (notes) => {
        // Filtra las notas no eliminadas (deleted = false)
        const active = notes.filter((n) => !n.deleted);
        this.allNotes.set(active);
        this.notesService.isLoading.set(false);

        // Solo en el primer arranque de la app (cuando restoredOnce es false)
        if (!this.restoredOnce) {
          this.restoredOnce = true;
          if (active.length === 0) {
            // Sin notas → crear una nota vacía por defecto y abrirla
            this.createNote();
          } else {
            // Hay notas → restaurar la última que estaba abierta (almacenada en localStorage)
            const lastId = this.notesService.getLastNoteId();
            if (lastId && !this.notesService.selectedNote()) {
              const saved = active.find((n) => n.id === lastId);
              if (saved) {
                this.selectNote(saved);
              }
            }
          }
        }
      },
      error: () => {
        this.notesService.isLoading.set(false);
      },
    });
  }

  // Selecciona una nota: la obtiene actualizada desde Firebase, la marca como seleccionada y cambia la vista a editor
  selectNote(note: Note) {
    this.notesService.getNoteById(note.id!).subscribe({
      next: (freshNote) => {
        this.notesService.selectNote(freshNote); // Actualiza la nota seleccionada en el servicio
        this.ui.currentView.set('editor'); // Cambia a la vista del editor
        this.ui.isLoginOpen.set(false); // Cierra el modal de login si estuviera abierto
      },
    });
  }

  /** Devuelve true si la nota no tiene contenido real (está vacía/sin usar) */
  private isNoteEmpty(note: Note): boolean {
    // Elimina etiquetas HTML y espacios en blanco para evaluar si el contenido está vacío
    const raw = (note.contenido || '').replace(/<[^>]*>/g, '').trim();
    return raw === '';
  }

  // Crea una nueva nota. Si la nota actual está vacía, no crea otra, solo la enfoca.
  createNote() {
    // Si la nota actual ya está abierta y vacía, no crear otra --- solo enfocarla
    const current = this.notesService.selectedNote();
    if (current && this.isNoteEmpty(current)) {
      this.ui.currentView.set('editor');
      this.ui.isLoginOpen.set(false);
      return;
    }

    // Llama al servicio para crear una nota con título por defecto y contenido vacío
    this.notesService
      .createNote({
        titulo: 'Untitled Document',
        contenido: '',
        pinned: false,
        archived: false,
        fechaCreacion: '',
        fechaActualizacion: '',
      })
      .subscribe({
        next: (newId) => {
          // Una vez creada, obtiene la nota completa por su ID
          this.notesService.getNoteById(newId).subscribe({
            next: (note) => {
              this.loadNotes(); // Recarga la lista de notas
              this.notesService.selectNote(note); // Selecciona la nueva nota
              this.ui.currentView.set('editor'); // Cambia al editor
              this.ui.isLoginOpen.set(false);
            },
            error: () => this.loadNotes(),
          });
        },
        error: () => {},
      });
  }

  // Elimina una nota (marcándola como deleted = true, no borrado físico)
  deleteNote(note: Note) {
    // Muestra un modal de confirmación con SweetAlert2
    Swal.fire({
      title: '<span class="text-[18px] font-bold">Delete Note</span>',
      html: '<span class="text-[14px] text-gray-500">Are you sure you want to delete this note?</span>',
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
        // Actualiza la nota cambiando deleted a true
        this.notesService
          .updateNote(note.id!, {
            titulo: note.titulo,
            contenido: note.contenido,
            pinned: note.pinned ?? false,
            archived: note.archived ?? false,
            deleted: true,
            fechaCreacion: note.fechaCreacion,
            fechaActualizacion: note.fechaActualizacion,
          })
          .subscribe({
            next: () => {
              // Si la nota eliminada era la que estaba seleccionada, se limpia la selección
              if (this.notesService.selectedNote()?.id === note.id) {
                this.notesService.selectNote(null);
              }
              this.loadNotes(); // Refresca la lista
            },
            error: () => {},
          });
      }
    });
  }

  // Alterna la visibilidad del menú "More" (submenú desplegable)
  toggleMoreMenu() {
    this.isMoreMenuOpen.update((v) => !v);
    // Si el sidebar está cerrado y se abre el menú "More", automáticamente expande el sidebar
    if (!this.ui.isSidebarOpen() && this.isMoreMenuOpen()) {
      this.ui.toggleSidebar();
    }
  }
}

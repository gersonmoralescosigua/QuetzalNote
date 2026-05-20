import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuillModule, ContentChange } from 'ngx-quill';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, QuillModule],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.scss'],
})
export class NoteEditorComponent {
  editorModules = { toolbar: false };

  // Signal para saber si hay texto
  hasText = signal(false);

  // Contadores de palabras y caracteres
  wordCount = signal(0);
  charCount = signal(0);

  // Detecta cambios en el editor
  onEditorChanged(event: ContentChange) {
    const text = event.text.trim();

    // Si la longitud del texto (sin espacios) es mayor a 0, ocultamos el botón
    this.hasText.set(text.length > 0);

    // Actualizar contador de caracteres
    this.charCount.set(text.length);

    // Actualizar contador de palabras
    this.wordCount.set(text.length > 0 ? text.split(/\s+/).length : 0);
  }

  // Modal para limpiar el editor
  promptClearEditor() {
    Swal.fire({
      title: '<span class="text-[18px] font-bold">Clear Editor</span>',
      html: '<span class="text-[14px] text-gray-500">Are you sure you want to clear the editor?</span>',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f', // Rojo exacto de la imagen
      cancelButtonColor: '#f3f4f6', // Gris claro
      confirmButtonText: 'Clear',
      cancelButtonText: '<span class="text-gray-700">Cancel</span>',
      width: '400px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton: 'px-5 py-2 rounded-md font-medium',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Aquí Isidro pondrá la lógica para borrar el contenido
        console.log('Editor limpiado');
      }
    });
  }
}

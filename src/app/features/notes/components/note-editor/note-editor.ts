// note-editor.ts — editor de notas con Quill: auto-guardado, importación de .docx
// y exportación en TXT/PDF/Word. Registra estilos y blots personalizados en Quill
// antes de que Angular inicialice el componente.
import { Component, signal, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuillModule, ContentChange } from 'ngx-quill';
import Quill from 'quill';
import { StyleAttributor, Scope } from 'parchment';
import Swal from 'sweetalert2';
import { NotesService } from '../../../../core/services/notes.service';
import { UiService } from '../../../../shared/services/ui.service';
import { PdfService } from '../../../../core/services/pdf.service';

// Registramos atributos de estilo inline para que Quill soporte tamaños y fuentes arbitrarios
const SizeStyle = new StyleAttributor('size', 'font-size', { scope: Scope.INLINE });
const FontStyle = new StyleAttributor('font', 'font-family', { scope: Scope.INLINE });
Quill.register(SizeStyle, true);
Quill.register(FontStyle, true);

// Blots personalizados: HR y salto de página
const BlockEmbed = Quill.import('blots/block/embed') as any;

class HorizontalRule extends BlockEmbed {
  static blotName = 'hr';
  static tagName = 'HR';
}
Quill.register(HorizontalRule);

class PageBreak extends BlockEmbed {
  static blotName = 'page-break';
  static tagName = 'DIV';
  static className = 'ql-page-break';
  static create() {
    const node = super.create();
    node.setAttribute('contenteditable', 'false');
    return node;
  }
}
Quill.register(PageBreak);

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, QuillModule],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.scss'],
})
export class NoteEditorComponent {
  // inyección de servicios
  private notesService = inject(NotesService);
  private ui = inject(UiService);
  private pdfService = inject(PdfService);

  // Toolbar deshabilitada aquí — la maneja EditorToolbar compartiendo la instancia Quill
  editorModules = {
    toolbar: false,
    history: { delay: 1000, maxStack: 100, userOnly: true },
    list: true,
  };

  hasText = signal(false);
  wordCount = signal(0);
  charCount = signal(0);
  copyDone = signal(false);

  private quillInstance: any = null;
  private currentNoteId: string | null = null;
  private saveTimeout: any = null; // debounce del auto-guardado

  constructor() {
    // Cargamos el contenido de la nota en Quill solo cuando cambia por ID,
    // para no pisar cambios que el usuario esté escribiendo en la misma nota.
    effect(() => {
      const note = this.notesService.selectedNote();
      if (note && this.quillInstance && note.id !== this.currentNoteId) {
        this.currentNoteId = note.id || null;
        this.quillInstance.clipboard.dangerouslyPasteHTML(note.contenido || '');
        this.quillInstance.blur();
      }
      if (this.quillInstance) {
        const text = this.quillInstance.getText().trim();
        this.hasText.set(text.length > 0);
        this.charCount.set(text.length);
        this.wordCount.set(text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0);
      }
    });
  }

  onEditorCreated(quill: any): void {
    this.quillInstance = quill;
    // Compartimos la instancia con EditorToolbar para que el toolbar funcione aquí también
    this.notesService.setQuillInstance(quill);
    quill.root.addEventListener('click', (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest('img') as HTMLImageElement;
      if (img) {
        // Quitar selección previa
        document
          .querySelectorAll('.ql-selected-img')
          .forEach((el) => el.classList.remove('ql-selected-img'));
        img.classList.add('ql-selected-img');
        img.style.outline = '2px solid #18639c';
        img.style.cursor = 'nw-resize';
      } else {
        document.querySelectorAll('.ql-selected-img').forEach((el: Element) => {
          (el as HTMLElement).style.outline = '';
          el.classList.remove('ql-selected-img');
        });
      }
    });
    const note = this.notesService.selectedNote();
    if (note) {
      this.currentNoteId = note.id || null;
      quill.clipboard.dangerouslyPasteHTML(note.contenido || '');
      quill.blur();
    }
  }

  onEditorChanged(event: ContentChange): void {
    const text = event.text.trim();
    this.hasText.set(text.length > 0);
    this.charCount.set(text.length);
    this.wordCount.set(text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0);

    // Debounce de 1.5s — guardamos solo cuando el usuario deja de escribir
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      const note = this.notesService.selectedNote();
      if (!note?.id) return;

      const contenido = this.quillInstance?.root.innerHTML || '';

      // Auto-título: si la nota es nueva, usamos la primera línea como título.
      // Con isAutoTitle evitamos disparar triggerReload() y el flash del loader.
      let titulo = note.titulo;
      let isAutoTitle = false;
      if (titulo === 'Untitled Document' && text.length > 0) {
        const firstLine = text.split('\n')[0].trim();
        if (firstLine) {
          titulo = firstLine.length > 60 ? firstLine.substring(0, 60) : firstLine;
          isAutoTitle = true;
        }
      }

      this.ui.isSaving.set(true);
      this.ui.lastSaved.set(false);

      this.notesService
        .updateNote(note.id, {
          titulo,
          contenido,
          pinned: note.pinned ?? false,
          archived: note.archived ?? false,
          deleted: note.deleted ?? false,
          fechaCreacion: note.fechaCreacion,
          fechaActualizacion: '',
        })
        .subscribe({
          next: (updated) => {
            this.notesService.selectNote(updated);
            this.ui.isSaving.set(false);
            this.ui.lastSaved.set(true);
            // Solo recargamos el sidebar cuando el título cambió manualmente;
            // si fue auto-asignado evitamos el flash del loader al escribir.
            if (titulo !== note.titulo && !isAutoTitle) {
              this.notesService.triggerReload();
            }
          },
          error: (err) => {
            console.error('[NoteEditor] Error al guardar:', err);
            this.ui.isSaving.set(false);
          },
        });
    }, 1500);
  }

  uploadDoc(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const doImport = async () => {
        try {
          // Usar PdfService para extraer HTML del .docx (preserva formato)
          const html = await this.pdfService.extractHtmlFromDocx(file);
          if (!html?.trim()) return;

          // Inserta el HTML al final del editor
          const pos = this.quillInstance?.getLength() ?? 0;
          this.quillInstance?.clipboard.dangerouslyPasteHTML(pos > 1 ? pos - 1 : 0, html);

          // Guarda automáticamente después de importar
          const note = this.notesService.selectedNote();
          if (note?.id) {
            const contenido = this.quillInstance?.root.innerHTML || '';
            this.notesService
              .updateNote(note.id, {
                titulo: note.titulo,
                contenido,
                pinned: note.pinned ?? false,
                archived: note.archived ?? false,
                deleted: note.deleted ?? false,
                fechaCreacion: note.fechaCreacion,
                fechaActualizacion: '',
              })
              .subscribe({ next: (updated) => this.notesService.selectNote(updated) });
          }
        } catch {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo leer el archivo.',
            icon: 'error',
            confirmButtonColor: '#18639c',
            width: '360px',
          });
        }
      };

      // Si ya hay contenido, preguntar antes de importar
      if (this.hasText()) {
        const { isConfirmed } = await Swal.fire({
          title: '<span class="text-[16px] font-bold">Import Document</span>',
          html: '<span class="text-[14px] text-gray-500">This will append the document content to the current note. Continue?</span>',
          showCancelButton: true,
          confirmButtonColor: '#18639c',
          cancelButtonColor: '#f3f4f6',
          confirmButtonText: 'Import',
          cancelButtonText: '<span class="text-gray-700">Cancel</span>',
          width: '420px',
          customClass: {
            popup: 'rounded-xl shadow-lg border border-gray-100',
            confirmButton: 'px-5 py-2 rounded-md font-medium text-white',
            cancelButton: 'px-5 py-2 rounded-md font-medium text-gray-700',
          },
        });
        if (!isConfirmed) return;
      }
      await doImport();
    };
    input.click();
  }

  // copiar contenido

  /**
   * Copia el contenido del editor al portapapeles.
   * Usa ClipboardItem para copiar HTML + texto plano (preserva tablas, estilos).
   * Si el navegador no soporta ClipboardItem, hace fallback a texto plano.
   */
  copyContent(): void {
    const html = this.quillInstance?.root.innerHTML || '';
    const text = this.quillInstance?.getText() || '';

    if (!text.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'No content to copy',
        text: 'Please enter some text in the editor first.',
        confirmButtonColor: '#18639c',
        width: '360px',
        customClass: { popup: 'rounded-xl shadow-lg' },
      });
      return;
    }

    if (navigator.clipboard && (window as any).ClipboardItem) {
      // LÓGICA: ClipboardItem permite copiar tanto HTML como texto plano.
      // Al pegar en Word o Google Docs, se usa el HTML (con formato completo).
      // Al pegar en un editor de texto, se usa el texto plano.
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([text], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];

      navigator.clipboard
        .write(data)
        .then(() => {
          this.copyDone.set(true);
          setTimeout(() => this.copyDone.set(false), 2000);
        })
        .catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
  }

  /** Fallback: copia solo texto plano si ClipboardItem no está disponible */
  private fallbackCopy(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copyDone.set(true);
      setTimeout(() => this.copyDone.set(false), 2000);
    });
  }

  // descargar nota

  /** Muestra el modal de selección de formato y descarga la nota */
  downloadNote(): void {
    const note = this.notesService.selectedNote();
    const text = this.quillInstance?.getText() || '';
    const html = this.quillInstance?.root.innerHTML || '';

    if (!text.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'No content to download',
        text: 'Please enter some text in the editor first.',
        confirmButtonColor: '#18639c',
        width: '360px',
        customClass: { popup: 'rounded-xl shadow-lg' },
      });
      return;
    }
    const fileName = note?.titulo?.replace(/[^\w\s-]/g, '').trim() || 'nota';
    let selectedFormat = 'txt';

    Swal.fire({
      title: '<div class="text-left text-[18px] font-bold">Download Your Notes</div>',
      html: `
        <p class="text-[13px] text-gray-500 mb-4 text-left">Please Select the File Type of download your notes</p>
        <div class="flex justify-between gap-3">
          <div id="sel-txt"
            class="flex-1 cursor-pointer flex flex-col items-center justify-center p-4
                   border-2 border-blue-500 rounded-lg relative transition-all">
            <div id="dot-txt" class="w-3 h-3 bg-blue-500 rounded-full absolute top-2 right-2"></div>
            <span class="material-icons text-blue-500 text-[36px] mb-2">description</span>
            <span class="font-bold text-[13px] text-gray-800">TEXT</span>
          </div>
          <div id="sel-pdf"
            class="flex-1 cursor-pointer flex flex-col items-center justify-center p-4
                   border border-gray-200 rounded-lg relative hover:bg-gray-50 transition-all">
            <div id="dot-pdf" class="w-3 h-3 bg-gray-300 rounded-full absolute top-2 right-2 hidden"></div>
            <span class="material-icons text-red-500 text-[36px] mb-2">picture_as_pdf</span>
            <span class="font-bold text-[13px] text-gray-800">PDF</span>
          </div>
          <div id="sel-word"
            class="flex-1 cursor-pointer flex flex-col items-center justify-center p-4
                   border border-gray-200 rounded-lg relative hover:bg-gray-50 transition-all">
            <div id="dot-word" class="w-3 h-3 bg-gray-300 rounded-full absolute top-2 right-2 hidden"></div>
            <span class="material-icons text-blue-700 text-[36px] mb-2">article</span>
            <span class="font-bold text-[13px] text-gray-800">WORD</span>
          </div>
        </div>
      `,
      showConfirmButton: true,
      showCancelButton: true,
      showCloseButton: true,
      cancelButtonText: 'Dismiss',
      confirmButtonText:
        'Download <span class="material-icons text-[18px] align-middle ml-1">download</span>',
      confirmButtonColor: '#000000',
      cancelButtonColor: 'transparent',
      width: '450px',
      customClass: {
        cancelButton: 'text-gray-400 font-medium shadow-none hover:text-gray-600 transition-colors',
        confirmButton: 'px-5 py-2.5 rounded-lg font-medium text-white flex items-center',
        actions: 'justify-between w-full mt-6 px-1',
        popup: 'rounded-xl shadow-lg border border-gray-100 p-6',
      },
      didOpen: () => {
        // Configurar eventos de selección de formato
        const formats = ['txt', 'pdf', 'word'];
        formats.forEach((id) => {
          document.getElementById(`sel-${id}`)?.addEventListener('click', () => {
            selectedFormat = id;
            formats.forEach((otherId) => {
              const el = document.getElementById(`sel-${otherId}`);
              const dot = document.getElementById(`dot-${otherId}`);
              if (otherId === id) {
                el?.classList.replace('border-gray-200', 'border-blue-500');
                el?.classList.add('border-2');
                dot?.classList.remove('hidden');
                dot?.classList.replace('bg-gray-300', 'bg-blue-500');
              } else {
                el?.classList.replace('border-blue-500', 'border-gray-200');
                el?.classList.remove('border-2');
                dot?.classList.add('hidden');
                dot?.classList.replace('bg-blue-500', 'bg-gray-300');
              }
            });
          });
        });
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      if (selectedFormat === 'txt') {
        // Descargar como texto plano
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (selectedFormat === 'pdf') {
        // LÓGICA: Usar el método HTML→PDF del PdfService (preserva formato)
        try {
          this.pdfService.convertHtmlToPdf(html, fileName);
        } catch {
          Swal.fire({
            title: 'Error',
            text: 'Could not generate the PDF. Please try again.',
            icon: 'error',
            confirmButtonColor: '#18639c',
            width: '360px',
          });
        }
      } else if (selectedFormat === 'word') {
        // LÓGICA: Convertir HTML a Word usando PdfService
        try {
          this.pdfService.convertToWord(html, fileName);
        } catch {
          Swal.fire({
            title: 'Error',
            text: 'Could not generate the Word file. Please try again.',
            icon: 'error',
            confirmButtonColor: '#18639c',
            width: '360px',
          });
        }
      }
    });
  }

  // limpiar editor

  /** Muestra confirmación y limpia el editor completamente */
  promptClearEditor(): void {
    Swal.fire({
      title: '<span class="text-[18px] font-bold">Clear Editor</span>',
      html: '<span class="text-[14px] text-gray-500">Are you sure you want to clear the editor?</span>',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#f3f4f6',
      confirmButtonText: 'Clear',
      cancelButtonText: '<span class="text-gray-700">Cancel</span>',
      width: '400px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium text-white',
        cancelButton: 'px-5 py-2 rounded-md font-medium text-gray-700',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Vacía el editor y resetea contadores locales
        if (this.quillInstance) this.quillInstance.setText('');
        this.hasText.set(false);
        this.wordCount.set(0);
        this.charCount.set(0);

        // Guarda el contenido vacío en Firebase
        const note = this.notesService.selectedNote();
        if (note?.id) {
          this.notesService
            .updateNote(note.id, {
              titulo: note.titulo,
              contenido: '',
              pinned: note.pinned ?? false,
              archived: note.archived ?? false,
              deleted: false,
              fechaCreacion: note.fechaCreacion,
              fechaActualizacion: '',
            })
            .subscribe({ next: (updated) => this.notesService.selectNote(updated) });
        }
      }
    });
  }
}

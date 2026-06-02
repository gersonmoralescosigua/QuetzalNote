import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuillModule, ContentChange } from 'ngx-quill';
import Quill from 'quill';
import { StyleAttributor, Scope } from 'parchment';
import Swal from 'sweetalert2';
import { NotesService } from '../../../../core/services/notes.service';

const SizeStyle = new StyleAttributor('size', 'font-size', { scope: Scope.INLINE });
const FontStyle = new StyleAttributor('font', 'font-family', { scope: Scope.INLINE });
Quill.register(SizeStyle, true);
Quill.register(FontStyle, true);

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
  private notesService = inject(NotesService);

  editorModules = {
    toolbar: false,
    history: { delay: 1000, maxStack: 100, userOnly: true },
  };
  hasText = signal(false);
  wordCount = signal(0);
  charCount = signal(0);
  copyDone = signal(false); // confirmación visual del botón copiar
  private quillInstance: any = null;
  private currentNoteId: string | null = null;
  private saveTimeout: any = null;

  constructor() {
    effect(() => {
      const note = this.notesService.selectedNote();
      if (note && this.quillInstance && note.id !== this.currentNoteId) {
        this.currentNoteId = note.id || null;
        this.quillInstance.clipboard.dangerouslyPasteHTML(note.contenido || '');
        this.quillInstance.blur();
        const text = this.quillInstance.getText().trim();
        this.hasText.set(text.length > 0);
        this.charCount.set(text.length);
        this.wordCount.set(text.length > 0 ? text.split(/\s+/).length : 0);
      }
    });
  }

  onEditorCreated(quill: any) {
    this.quillInstance = quill;
    this.notesService.setQuillInstance(quill);
    const note = this.notesService.selectedNote();
    if (note) {
      this.currentNoteId = note.id || null;
      quill.clipboard.dangerouslyPasteHTML(note.contenido || '');
      quill.blur();
    }
  }

  onEditorChanged(event: ContentChange) {
    const text = event.text.trim();
    this.hasText.set(text.length > 0);
    this.charCount.set(text.length);
    this.wordCount.set(text.length > 0 ? text.split(/\s+/).length : 0);

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      const note = this.notesService.selectedNote();
      if (!note?.id) return;
      const contenido = this.quillInstance?.root.innerHTML || '';

      // Auto-título: si sigue siendo "Untitled Document", tomar el primer renglón del contenido
      let titulo = note.titulo;
      if (titulo === 'Untitled Document' && text.length > 0) {
        const firstLine = text.split('\n')[0].trim();
        if (firstLine) {
          titulo = firstLine.length > 60 ? firstLine.substring(0, 60) : firstLine;
        }
      }

      this.notesService.updateNote(note.id, {
        titulo,
        contenido,
        pinned: note.pinned ?? false,
        archived: note.archived ?? false,
        deleted: note.deleted ?? false,
        fechaCreacion: note.fechaCreacion,
        fechaActualizacion: ''
      }).subscribe({
        next: (updated) => {
          this.notesService.selectNote(updated);
          // Refrescar sidebar solo si el título cambió
          if (titulo !== note.titulo) {
            this.notesService.triggerReload();
          }
        },
        error: (err) => console.error('Error al guardar:', err)
      });
    }, 1500);
  }

  // ── Botón 1: Importar documento Word (.docx) ─────────────────────────────
  uploadDoc() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const doImport = async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const mammoth = (window as any).mammoth;
          if (!mammoth) {
            Swal.fire({ title: 'Error', text: 'mammoth.js no está disponible.', icon: 'error', confirmButtonColor: '#18639c', width: '360px' });
            return;
          }
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          if (!html?.trim()) return;

          const pos = this.quillInstance?.getLength() ?? 0;
          // Insertar al final del contenido actual
          this.quillInstance?.clipboard.dangerouslyPasteHTML(pos > 1 ? pos - 1 : 0, html);

          // Guardar en Firebase
          const note = this.notesService.selectedNote();
          if (note?.id) {
            const contenido = this.quillInstance?.root.innerHTML || '';
            this.notesService.updateNote(note.id, {
              titulo: note.titulo, contenido,
              pinned: note.pinned ?? false, archived: note.archived ?? false,
              deleted: note.deleted ?? false,
              fechaCreacion: note.fechaCreacion, fechaActualizacion: ''
            }).subscribe({ next: (updated) => this.notesService.selectNote(updated) });
          }
        } catch {
          Swal.fire({ title: 'Error', text: 'No se pudo leer el archivo.', icon: 'error', confirmButtonColor: '#18639c', width: '360px' });
        }
      };

      // Si ya hay contenido, pedir confirmación antes de importar
      const note = this.notesService.selectedNote();
      const hasContent = this.hasText();
      if (hasContent) {
        const { isConfirmed } = await Swal.fire({
          title: '<span class="text-[16px] font-bold">Import Document</span>',
          html: '<span class="text-[14px] text-gray-500">This will append the document content to the current note. Continue?</span>',
          showCancelButton: true,
          confirmButtonColor: '#18639c',
          cancelButtonColor: '#f3f4f6',
          confirmButtonText: 'Import',
          cancelButtonText: '<span class="text-gray-700">Cancel</span>',
          width: '420px',
          customClass: { popup: 'rounded-xl shadow-lg border border-gray-100', confirmButton: 'px-5 py-2 rounded-md font-medium', cancelButton: 'px-5 py-2 rounded-md font-medium' },
        });
        if (!isConfirmed) return;
      }
      await doImport();
    };
    input.click();
  }

  // ── Botón 2: Copiar contenido con confirmación visual ─────────────────────
  copyContent() {
    const text = this.quillInstance?.getText() || '';
    navigator.clipboard.writeText(text).then(() => {
      this.copyDone.set(true);
      setTimeout(() => this.copyDone.set(false), 2000);
    });
  }

  downloadNote() {
    const note = this.notesService.selectedNote();
    const text = this.quillInstance?.getText() || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note?.titulo || 'nota'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  promptClearEditor() {
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
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton: 'px-5 py-2 rounded-md font-medium',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Limpiar editor
        if (this.quillInstance) this.quillInstance.setText('');
        // Resetear contadores locales
        this.hasText.set(false);
        this.wordCount.set(0);
        this.charCount.set(0);

        const note = this.notesService.selectedNote();
        if (note?.id) {
          this.notesService.updateNote(note.id, {
            titulo: note.titulo,       // El título NO cambia
            contenido: '',
            pinned: note.pinned ?? false,
            archived: note.archived ?? false,
            deleted: false,
            fechaCreacion: note.fechaCreacion,
            fechaActualizacion: ''
          }).subscribe({
            next: (updated) => this.notesService.selectNote(updated)
          });
        }
      }
    });
  }
}

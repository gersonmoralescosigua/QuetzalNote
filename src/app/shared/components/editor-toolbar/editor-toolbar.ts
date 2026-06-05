import { Component, inject, signal, effect, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { NotesService } from '../../../core/services/notes.service';

// ── Constantes de valores ────────────────────────────────────────────────────
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];
const FONTS = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana'];

/** Colores del picker avanzado — fila de acceso rápido */
const QUICK_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#16a34a',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#000000',
  '#6b7280',
  '#d1d5db',
];

/** Colores de la paleta completa (para compatibilidad con código existente) */
const COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#cccccc',
  '#ffffff',
  '#ff0000',
  '#ff4500',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#ea9999',
  '#f9cb9c',
  '#ffe599',
  '#b6d7a8',
  '#a2c4c9',
  '#9fc5e8',
  '#b4a7d6',
  '#ea99d5',
  '#e06666',
  '#f6b26b',
  '#ffd966',
  '#93c47d',
  '#76a5af',
  '#6fa8dc',
  '#8e7cc3',
  '#c27ba0',
  '#cc0000',
  '#e69138',
  '#f1c232',
  '#6aa84f',
];

/** Lenguajes disponibles para el selector contextual de Code Block */
const CODE_LANGUAGES = [
  'Plain Text',
  'C',
  'C-like',
  'C++',
  'CSS',
  'HTML',
  'Java',
  'JavaScript',
  'Markdown',
  'Objective-C',
  'PowerShell',
  'Python',
  'Rust',
  'SQL',
  'Swift',
  'TypeScript',
  'XML',
];

interface MenuPos {
  top: number;
  left: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: EditorToolbar
// Barra de herramientas del editor Quill.
// Se puede reutilizar en la vista del editor de notas Y en la vista PDF.
// Comunicación con Quill: a través de NotesService.quillInstance() (signal).
// ══════════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-toolbar.html',
  styleUrl: './editor-toolbar.scss',
})
export class EditorToolbar {
  private notesService = inject(NotesService);
  private _elementRef = inject(ElementRef);
  private quill: any = null;

  // ── Signals de estado de formato ─────────────────────────────────────────
  isBold = signal(false);
  isItalic = signal(false);
  isUnderline = signal(false);
  isCode = signal(false);
  currentHeading = signal<number | false>(false);
  currentList = signal<'ordered' | 'bullet' | 'check' | false>(false);
  isBlockquote = signal(false);
  currentFont = signal('Arial');
  fontSize = signal(16);
  currentAlign = signal('left');
  currentColor = signal('#000000');

  // ── Signals de menús desplegables principales ─────────────────────────────
  isFontMenuOpen = signal(false);
  isHeadingMenuOpen = signal(false);
  isAlignMenuOpen = signal(false);
  isColorMenuOpen = signal(false);
  isInsertMenuOpen = signal(false);
  isAaMenuOpen = signal(false); // Menú de herramientas de texto (Uppercase, Lowercase…)
  isLangMenuOpen = signal(false); // Selector de lenguaje (solo en Code Block)
  isLinkPopupOpen = signal(false); // Popup flotante de link

  // ── Posiciones de menús ───────────────────────────────────────────────────
  fontMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  headingMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  colorMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  alignMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  insertMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  aaMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  langMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  linkPopupPos = signal<MenuPos>({ top: 0, left: 0 });

  // ── Datos estáticos expuestos al template ─────────────────────────────────
  fonts = FONTS;
  colors = COLORS;
  quickColors = QUICK_COLORS;
  codeLanguages = CODE_LANGUAGES;

  // ── Color picker avanzado ─────────────────────────────────────────────────
  hueValue = signal(0); // Valor del slider de hue (0–360)
  currentHue = signal('hsl(0, 100%, 50%)'); // Color puro de la hue actual
  gradientX = signal(0); // Posición X del selector en el gradiente (%)
  gradientY = signal(100); // Posición Y del selector en el gradiente (%)
  hexInput = signal('#000000'); // Valor del campo HEX

  // ── Code Block ────────────────────────────────────────────────────────────
  currentLanguage = signal('JavaScript'); // Lenguaje seleccionado en code block

  // ── Link popup ────────────────────────────────────────────────────────────
  linkInputValue = signal('https://');
  private savedLinkRange: any = null; // Rango de Quill guardado al abrir el popup

  constructor() {
    effect(() => {
      const q = this.notesService.quillInstance();
      if (q && q !== this.quill) {
        this.quill = q;
        this.quill.on('selection-change', () => this.updateFormats());

        // Si el usuario escribe algo, quitamos la selección de la imagen para evitar errores visuales
        this.quill.on('text-change', () => {
          this.updateFormats();
          const handle = document.getElementById('img-resize-handle');
          if (handle) handle.remove();
          this.quill.root.querySelectorAll('img').forEach((img: HTMLElement) => {
            img.classList.remove('active-img');
          });
        });

        const editorRoot = this.quill.root as HTMLElement;

        // --- LÓGICA DE CLIC: SELECCIONAR Y CAMBIAR TAMAÑO ---
        editorRoot.addEventListener('click', (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          // 1. Limpiar el tirador anterior y deseleccionar otras imágenes
          const oldHandle = document.getElementById('img-resize-handle');
          if (oldHandle) oldHandle.remove();
          editorRoot.querySelectorAll('img').forEach((img) => {
            img.classList.remove('active-img');
          });

          // 2. Si hicimos clic en una imagen, construimos la interactividad
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            img.classList.add('active-img');

            // Asegurarse de que el editor tenga posición relativa para que el tirador se ubique bien
            editorRoot.style.position = 'relative';

            // Crear el "Tirador" (el puntito azul) para cambiar tamaño
            const handle = document.createElement('div');
            handle.id = 'img-resize-handle';
            handle.style.cssText = `
              position: absolute;
              width: 14px; height: 14px;
              background: #18639c;
              border: 2px solid white;
              border-radius: 50%;
              cursor: se-resize;
              z-index: 100;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;

            // Posicionar el puntito justo en la esquina inferior derecha
            const updateHandlePosition = () => {
              handle.style.top = `${img.offsetTop + img.offsetHeight - 7}px`;
              handle.style.left = `${img.offsetLeft + img.offsetWidth - 7}px`;
            };
            updateHandlePosition();
            editorRoot.appendChild(handle);

            // 3. Matemáticas para arrastrar el tirador y cambiar tamaño
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;

            handle.addEventListener('mousedown', (event: MouseEvent) => {
              isResizing = true;
              startX = event.clientX;
              startWidth = img.offsetWidth;
              event.preventDefault(); // Evitar seleccionar texto por error
            });

            const onMouseMove = (event: MouseEvent) => {
              if (!isResizing) return;
              const newWidth = startWidth + (event.clientX - startX);
              // Evitar que la imagen se haga microscópica (mínimo 50px)
              if (newWidth > 50) {
                img.style.width = `${newWidth}px`;
                img.style.height = 'auto'; // Mantener proporción original
                updateHandlePosition();
              }
            };

            const onMouseUp = () => {
              if (isResizing) {
                isResizing = false;
                this.quill.update(); // Guardar el nuevo tamaño en Quill
              }
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }
        });

        // --- LÓGICA DE DRAG & DROP: MOVER LA IMAGEN ---
        editorRoot.addEventListener('mousedown', (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          // Si tocamos la imagen (pero no el tirador de tamaño), la hacemos arrastrable
          if (target.tagName === 'IMG' && target.id !== 'img-resize-handle') {
            target.setAttribute('draggable', 'true');
          }
        });
      }
    });
  }

  // ── Actualizar estado de formato ──────────────────────────────────────────

  /** Lee el formato actual de Quill y actualiza todos los signals */
  private updateFormats(): void {
    if (!this.quill) return;
    const format = this.quill.getFormat();
    this.isBold.set(!!format['bold']);
    this.isItalic.set(!!format['italic']);
    this.isUnderline.set(!!format['underline']);
    this.isCode.set(!!format['code-block']);
    this.currentHeading.set(format['header'] || false);
    let listVal = format['list'];
    if (listVal === 'unchecked') listVal = 'check';
    this.currentList.set(listVal || false);
    this.isBlockquote.set(!!format['blockquote']);
    this.currentAlign.set(format['align'] || 'left');
    const color = format['color'] || '#000000';
    this.currentColor.set(color);
    this.hexInput.set(color);
    if (format['font']) {
      this.currentFont.set((format['font'] as string).replace(/['"]/g, '').trim());
    }
    if (format['size']) {
      const num = parseInt(format['size'] as string);
      if (!isNaN(num)) this.fontSize.set(num);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Calcula la posición del menú basándose en el botón que lo disparó */
  private getPos(event: MouseEvent): MenuPos {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }

  /** Labels para el botón de tipo de bloque (heading/list/quote) */
  headingLabel(): string {
    const list = this.currentList();
    if (list === 'ordered') return 'Numbered List';
    if (list === 'bullet') return 'Bullet List';
    if (list === 'check') return 'Check List';
    if (this.isBlockquote()) return 'Quote';
    if (this.isCode()) return 'Code Block';
    const h = this.currentHeading();
    if (h === 1) return 'Heading 1';
    if (h === 2) return 'Heading 2';
    if (h === 3) return 'Heading 3';
    return 'Normal';
  }

  /** Ícono para el botón de tipo de bloque */
  headingMenuIcon(): string {
    const list = this.currentList();
    if (list === 'ordered') return 'format_list_numbered';
    if (list === 'bullet') return 'format_list_bulleted';
    if (list === 'check') return 'checklist';
    if (this.isBlockquote()) return 'format_quote';
    if (this.isCode()) return 'code';
    return 'format_align_left';
  }

  isNormalBlock(): boolean {
    return !this.currentHeading() && !this.currentList() && !this.isBlockquote() && !this.isCode();
  }

  alignIcon(): string {
    const a = this.currentAlign();
    if (a === 'center') return 'format_align_center';
    if (a === 'right') return 'format_align_right';
    if (a === 'justify') return 'format_align_justify';
    return 'format_align_left';
  }

  alignLabel(): string {
    const a = this.currentAlign();
    if (a === 'center') return 'Center Align';
    if (a === 'right') return 'Right Align';
    if (a === 'justify') return 'Justify Align';
    if (a === 'start') return 'Start Align';
    if (a === 'end') return 'End Align';
    return 'Left Align';
  }

  // ── Deshacer / Rehacer ────────────────────────────────────────────────────
  undo() {
    this.quill?.getModule('history')?.undo();
  }
  redo() {
    this.quill?.getModule('history')?.redo();
  }

  // ── Formato básico ────────────────────────────────────────────────────────
  toggleBold() {
    const val = !this.quill?.getFormat()['bold'];
    this.quill?.format('bold', val);
    this.isBold.set(val);
  }
  toggleItalic() {
    const val = !this.quill?.getFormat()['italic'];
    this.quill?.format('italic', val);
    this.isItalic.set(val);
  }
  toggleUnderline() {
    const val = !this.quill?.getFormat()['underline'];
    this.quill?.format('underline', val);
    this.isUnderline.set(val);
  }
  toggleCode() {
    const val = !this.quill?.getFormat()['code-block'];
    this.quill?.format('code-block', val);
    this.isCode.set(val);
  }

  // ── Tipo de bloque ────────────────────────────────────────────────────────
  setHeading(level: number | false) {
    this.quill?.format('header', level || false);
    if (level) {
      this.quill?.format('list', false);
      this.quill?.format('blockquote', false);
      this.quill?.format('code-block', false);
    }
    this.currentHeading.set(level);
    this.currentList.set(false);
    this.isBlockquote.set(false);
    this.isHeadingMenuOpen.set(false);
  }

  setList(type: 'ordered' | 'bullet' | 'check') {
    const current = this.currentList();
    let newVal: false | string = current === type ? false : type;
    // Convertir 'check' a 'unchecked' para Quill
    let quillValue = newVal === 'check' ? 'unchecked' : newVal;
    this.quill?.format('list', quillValue || false);
    if (newVal) {
      this.quill?.format('header', false);
      this.quill?.format('blockquote', false);
      this.quill?.format('code-block', false);
    }
    // Guardar el valor original (con 'check') para la UI
    this.currentList.set(newVal ? type : false);
    this.currentHeading.set(false);
    this.isBlockquote.set(false);
    this.isHeadingMenuOpen.set(false);
  }

  setBlockquote() {
    const newVal = !this.isBlockquote();
    this.quill?.format('blockquote', newVal);
    if (newVal) {
      this.quill?.format('header', false);
      this.quill?.format('list', false);
      this.quill?.format('code-block', false);
      this.currentHeading.set(false);
      this.currentList.set(false);
    }
    this.isBlockquote.set(newVal);
    this.isHeadingMenuOpen.set(false);
  }

  setCodeBlockFromMenu() {
    const newVal = !this.isCode();
    this.quill?.format('code-block', newVal);
    if (newVal) {
      this.quill?.format('header', false);
      this.quill?.format('list', false);
      this.quill?.format('blockquote', false);
      this.currentHeading.set(false);
      this.currentList.set(false);
      this.isBlockquote.set(false);
    }
    this.isCode.set(newVal);
    this.isHeadingMenuOpen.set(false);
  }

  // ── Tamaño de fuente ──────────────────────────────────────────────────────
  increaseFontSize() {
    const idx = FONT_SIZES.indexOf(this.fontSize());
    const next = idx !== -1 && idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : this.fontSize();
    this.fontSize.set(next);
    this.quill?.format('size', `${next}px`);
  }
  decreaseFontSize() {
    const idx = FONT_SIZES.indexOf(this.fontSize());
    const prev = idx > 0 ? FONT_SIZES[idx - 1] : this.fontSize();
    this.fontSize.set(prev);
    this.quill?.format('size', `${prev}px`);
  }

  // ── Fuente ────────────────────────────────────────────────────────────────
  setFont(font: string) {
    this.quill?.format('font', font);
    this.currentFont.set(font);
    this.isFontMenuOpen.set(false);
  }

  // ── Alineación ────────────────────────────────────────────────────────────
  setAlign(align: string) {
    this.quill?.format('align', align === 'left' ? false : align);
    this.currentAlign.set(align);
    this.isAlignMenuOpen.set(false);
  }
  indent() {
    const range = this.quill?.getSelection();
    if (!range) return;
    this.quill?.format('indent', '+1');
    this.isAlignMenuOpen.set(false);
  }
  outdent() {
    const range = this.quill?.getSelection();
    if (!range) return;
    this.quill?.format('indent', '-1');
    this.isAlignMenuOpen.set(false);
  }

  // ── Color ─────────────────────────────────────────────────────────────────
  setColor(color: string) {
    this.quill?.format('color', color);
    this.currentColor.set(color);
    this.hexInput.set(color);
    this.isColorMenuOpen.set(false);
  }

  /** Aplica el color desde el input HEX si el formato es válido */
  applyHexColor(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      this.quill?.format('color', val);
      this.currentColor.set(val);
    }
  }

  /** Actualiza el hue y recalcula el color */
  onHueChange(event: Event): void {
    const hue = parseInt((event.target as HTMLInputElement).value);
    this.hueValue.set(hue);
    this.currentHue.set(`hsl(${hue}, 100%, 50%)`);
    this.updateColorFromGradient();
  }

  /** Click en el área del gradiente → actualiza X,Y y el color */
  onGradientClick(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    this.gradientX.set(x);
    this.gradientY.set(y);
    this.updateColorFromGradient();
  }

  private updateColorFromGradient(): void {
    const h = this.hueValue();
    const s = this.gradientX(); // saturación (0–100%)
    const v = 100 - this.gradientY(); // valor/brillo (0–100%)
    // Convertir HSV a HEX para Quill
    const color = this.hsvToHex(h, s, v);
    this.currentColor.set(color);
    this.hexInput.set(color);
    this.quill?.format('color', color);
  }

  private hsvToHex(h: number, s: number, v: number): string {
    s /= 100;
    v /= 100;
    const f = (n: number) => {
      const k = (n + h / 60) % 6;
      const val = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
      return Math.round(val * 255)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(5)}${f(3)}${f(1)}`;
  }

  // ── Menú "Aa" — Herramientas de texto ────────────────────────────────────

  toUppercase(): void {
    const range = this.quill?.getSelection();
    if (!range || range.length === 0) {
      this.isAaMenuOpen.set(false);
      return;
    }
    const text = this.quill?.getText(range.index, range.length) || '';
    this.quill?.deleteText(range.index, range.length);
    this.quill?.insertText(range.index, text.toUpperCase());
    this.isAaMenuOpen.set(false);
  }

  toLowercase(): void {
    const range = this.quill?.getSelection();
    if (!range || range.length === 0) {
      this.isAaMenuOpen.set(false);
      return;
    }
    const text = this.quill?.getText(range.index, range.length) || '';
    this.quill?.deleteText(range.index, range.length);
    this.quill?.insertText(range.index, text.toLowerCase());
    this.isAaMenuOpen.set(false);
  }

  toCapitalize(): void {
    const range = this.quill?.getSelection();
    if (!range || range.length === 0) {
      this.isAaMenuOpen.set(false);
      return;
    }
    const text = this.quill?.getText(range.index, range.length) || '';
    const capitalized = text.replace(/\b\w/g, (c: string) => c.toUpperCase());
    this.quill?.deleteText(range.index, range.length);
    this.quill?.insertText(range.index, capitalized);
    this.isAaMenuOpen.set(false);
  }

  toggleStrikethrough(): void {
    const val = !this.quill?.getFormat()['strike'];
    this.quill?.format('strike', val);
    this.isAaMenuOpen.set(false);
  }

  toggleSubscript(): void {
    const current = this.quill?.getFormat()['script'];
    this.quill?.format('script', current === 'sub' ? false : 'sub');
    this.isAaMenuOpen.set(false);
  }

  toggleHighlight(): void {
    const current = this.quill?.getFormat()['background'];
    // LÓGICA: Usamos 'background' de Quill para simular highlight amarillo
    this.quill?.format('background', current === '#ffff00' ? false : '#ffff00');
    this.isAaMenuOpen.set(false);
  }

  clearFormatting(): void {
    const range = this.quill?.getSelection();
    if (!range) {
      this.isAaMenuOpen.set(false);
      return;
    }
    // removeFormat elimina todos los formatos inline en el rango seleccionado
    this.quill?.removeFormat(range.index, range.length);
    this.isAaMenuOpen.set(false);
  }

  // ── Code Block — Selector de lenguaje ────────────────────────────────────

  setCodeLanguage(lang: string): void {
    this.currentLanguage.set(lang);
    this.isLangMenuOpen.set(false);
    // Guardar el lenguaje como atributo data en el bloque activo
    const range = this.quill?.getSelection();
    if (range) {
      const [block] = this.quill?.getLine(range.index) || [];
      if (block?.domNode) {
        block.domNode.setAttribute('data-language', lang.toLowerCase());
      }
    }
  }

  // ── Link Popup Flotante ───────────────────────────────────────────────────

  /** Abre el popup de link solo si hay texto seleccionado */
  openLinkPopup(): void {
    const range = this.quill?.getSelection();
    if (!range || range.length === 0) {
      // Sin selección — no hacer nada (o agregar link en posición actual)
      return;
    }
    this.savedLinkRange = range;

    // Calcular posición debajo del texto seleccionado
    const bounds = this.quill?.getBounds(range.index, range.length);
    const editorEl = this.quill?.root as HTMLElement;
    const editorRect = editorEl?.getBoundingClientRect();
    if (bounds && editorRect) {
      this.linkPopupPos.set({
        top: editorRect.top + bounds.bottom + 6,
        left: editorRect.left + bounds.left,
      });
    }

    // Pre-llenar el input si ya hay un link
    const format = this.quill?.getFormat(range);
    this.linkInputValue.set(format?.['link'] || 'https://');
    this.isLinkPopupOpen.set(true);
  }

  confirmLink(): void {
    const url = this.linkInputValue();
    if (!url || url === 'https://') {
      this.cancelLink();
      return;
    }
    if (this.savedLinkRange) {
      this.quill?.formatText(this.savedLinkRange.index, this.savedLinkRange.length, 'link', url);
    }
    this.isLinkPopupOpen.set(false);
    this.savedLinkRange = null;
  }

  cancelLink(): void {
    this.isLinkPopupOpen.set(false);
    this.savedLinkRange = null;
  }

  // ── Insert: Elementos especiales ──────────────────────────────────────────

  insertHorizontalRule(): void {
    const range = this.quill?.getSelection(true);
    const pos = range?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertEmbed(pos, 'hr', true);
    this.quill?.setSelection(pos + 1);
    this.isInsertMenuOpen.set(false);
  }

  insertPageBreak(): void {
    const range = this.quill?.getSelection(true);
    const pos = range?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertEmbed(pos, 'page-break', true);
    this.quill?.setSelection(pos + 1);
    this.isInsertMenuOpen.set(false);
  }

  insertImage(): void {
    this.isInsertMenuOpen.set(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
        this.quill?.insertEmbed(pos, 'image', reader.result);
        // Dar un momento para que el DOM renderice y luego hacer la imagen draggable:
        setTimeout(() => {
          const imgs = this.quill?.root.querySelectorAll('img');
          if (imgs) {
            imgs.forEach((img: HTMLImageElement) => {
              img.draggable = true;
              img.style.cursor = 'move';
            });
          }
        }, 100);
        this.quill?.setSelection(pos + 1);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /** Inserta una tabla preguntando filas y columnas con un modal que respeta el tema */
  async insertTable(): Promise<void> {
    this.isInsertMenuOpen.set(false);
    const theme = this.getSwalTheme();

    const { value } = await Swal.fire({
      title: '<span style="color:#f9fafb;font-size:15px;font-weight:600">Insert Table</span>',
      html: `
      <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
        <div>
          <label style="font-size:12px;color:#9ca3af;display:block;margin-bottom:4px">Rows</label>
          <input id="tbl-rows" type="number" value="5" min="1" max="50"
            style="width:100%;padding:8px 12px;border:1px solid ${theme.borderColor};border-radius:6px;
                   background:${theme.inputBg};color:${theme.color};font-size:14px;outline:none"/>
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;display:block;margin-bottom:4px">Columns</label>
          <input id="tbl-cols" type="number" value="5" min="1" max="20"
            style="width:100%;padding:8px 12px;border:1px solid ${theme.borderColor};border-radius:6px;
                   background:${theme.inputBg};color:${theme.color};font-size:14px;outline:none"/>
        </div>
      </div>
    `,
      background: theme.background,
      color: theme.color,
      confirmButtonText: 'Confirm',
      confirmButtonColor: '#18639c',
      showCancelButton: false,
      width: '280px',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'px-6 py-2 rounded-lg font-medium',
      },
      preConfirm: () => ({
        rows: parseInt((document.getElementById('tbl-rows') as HTMLInputElement).value) || 5,
        cols: parseInt((document.getElementById('tbl-cols') as HTMLInputElement).value) || 5,
      }),
    });

    if (!value) return;
    const { rows, cols } = value;
    const td = 'border:1px solid #d1d5db;padding:6px 10px;min-width:60px;';
    const cell = `<td style="${td}">&nbsp;</td>`;
    const row = `<tr>${cell.repeat(cols)}</tr>`;
    const html =
      `<table style="border-collapse:collapse;width:100%;margin:8px 0;">` +
      `<tbody>${row.repeat(rows)}</tbody></table>`;
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
  }

  /** Abre modal "Insert Columns Layout" con selector de formato que respeta el tema */
  async insertColumns(): Promise<void> {
    this.isInsertMenuOpen.set(false);
    const theme = this.getSwalTheme();

    const { value: layout } = await Swal.fire({
      title:
        '<span style="color:#f9fafb;font-size:16px;font-weight:700">Insert Columns Layout</span>',
      html: `
      <select id="col-layout"
        style="width:100%;padding:10px 12px;border:1px solid ${theme.borderColor};border-radius:8px;
               background:${theme.inputBg};color:${theme.color};font-size:14px;outline:none;cursor:pointer">
        <option value="2-equal" style="background:${theme.inputBg};color:${theme.color}">2 columns (equal width)</option>
        <option value="3-equal" style="background:${theme.inputBg};color:${theme.color}">3 columns (equal width)</option>
        <option value="2-left" style="background:${theme.inputBg};color:${theme.color}">2 columns (left wider)</option>
        <option value="2-right" style="background:${theme.inputBg};color:${theme.color}">2 columns (right wider)</option>
      </select>
    `,
      background: theme.background,
      color: theme.color,
      confirmButtonText: 'Insert',
      confirmButtonColor: '#374151',
      showCancelButton: false,
      width: '360px',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'px-6 py-2 rounded-lg font-medium',
      },
      preConfirm: () => (document.getElementById('col-layout') as HTMLSelectElement).value,
    });

    if (!layout) return;
    const colStyle = 'border:1px solid #e5e7eb;padding:12px;border-radius:4px;min-height:60px;';
    let html = '';
    if (layout === '2-equal') {
      html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0">
      <div style="${colStyle}">Column 1</div><div style="${colStyle}">Column 2</div></div>`;
    } else if (layout === '3-equal') {
      html = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0">
      <div style="${colStyle}">Col 1</div><div style="${colStyle}">Col 2</div><div style="${colStyle}">Col 3</div></div>`;
    } else if (layout === '2-left') {
      html = `<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin:8px 0">
      <div style="${colStyle}">Main content</div><div style="${colStyle}">Sidebar</div></div>`;
    } else {
      html = `<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin:8px 0">
      <div style="${colStyle}">Sidebar</div><div style="${colStyle}">Main content</div></div>`;
    }
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
  }

  /** Modal de ecuación fiel al original: Inline checkbox, input, Visualization, respetando tema */
  async insertEquation(): Promise<void> {
    this.isInsertMenuOpen.set(false);
    const savedRange = this.quill?.getSelection();
    const theme = this.getSwalTheme();

    await Swal.fire({
      title: '<span style="color:#f9fafb;font-size:15px;font-weight:600">Insert Equation</span>',
      html: `
      <div style="text-align:left">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:12px">
          <label style="font-size:13px;color:#9ca3af">Inline</label>
          <input type="checkbox" id="eq-inline" checked
            style="width:15px;height:15px;accent-color:#18639c;cursor:pointer"/>
        </div>
        <div style="margin-bottom:6px">
          <label style="font-size:11px;color:#9ca3af;display:block;margin-bottom:4px;text-align:right">Equation</label>
          <input id="eq-input" type="text" placeholder="e.g. E = mc²"
            style="width:100%;padding:8px 12px;border:1px solid ${theme.borderColor};border-radius:6px;
                   background:${theme.inputBg};color:${theme.color};font-size:14px;outline:none"
            oninput="document.getElementById('eq-viz').textContent = this.value || '...'"/>
        </div>
        <div style="margin-top:12px">
          <label style="font-size:11px;color:#9ca3af;display:block;margin-bottom:4px;text-align:right">Visualization</label>
          <div id="eq-viz"
            style="font-family:serif;font-style:italic;font-size:1.3em;color:${theme.color};
                   min-height:36px;padding:8px;background:${theme.inputBg === '#374151' ? '#111827' : '#f3f4f6'};border-radius:6px;
                   text-align:center;letter-spacing:1px">...</div>
        </div>
      </div>
    `,
      background: theme.background,
      color: theme.color,
      confirmButtonText: 'Confirm',
      confirmButtonColor: '#18639c',
      showCancelButton: false,
      width: '340px',
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'px-6 py-2 rounded-lg font-medium',
      },
      preConfirm: () => ({
        equation: (document.getElementById('eq-input') as HTMLInputElement).value,
        inline: (document.getElementById('eq-inline') as HTMLInputElement).checked,
      }),
    }).then(({ value }) => {
      if (!value?.equation) return;
      const pos = savedRange?.index ?? this.quill?.getLength() ?? 0;
      const html = `<span style="font-family:serif;font-style:italic;font-size:1.1em;">${value.equation}</span>`;
      this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
    });
  }

  /** Inserta un Post-it flotante real, independiente del texto, con cambio de color y arrastrable */
  insertStickyNote(): void {
    this.isInsertMenuOpen.set(false);

    // 1. Buscamos el contenedor del editor
    const container = (document.querySelector('.ql-container') as HTMLElement) || document.body;

    // 2. Creamos el elemento de la nota desde cero
    const stickyEl = document.createElement('div');

    // Estilos base de la nota flotante
    stickyEl.style.cssText = `
      position: absolute;
      top: 40px;
      left: 50%;
      width: 220px;
      min-height: 200px;
      background: #fef08a;
      box-shadow: 3px 5px 15px rgba(0,0,0,0.2);
      border-radius: 2px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      font-family: 'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif;
      color: #333;
    `;

    // 3. Estructura interna
    stickyEl.innerHTML = `
      <!-- Barra superior para arrastrar -->
      <div class="drag-handle" style="height: 30px; background: rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; padding: 0 8px; cursor: grab;">
        <span style="font-size: 14px; opacity: 0.6; user-select: none;">📌</span>
        
        <!-- Controles de la derecha -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="color" value="#fef08a" class="color-picker" style="width: 20px; height: 20px; padding: 0; border: none; background: transparent; cursor: pointer;" title="Cambiar color">
          <span class="material-icons close-btn" style="font-size: 18px; cursor: pointer; opacity: 0.7; user-select: none;">close</span>
        </div>
      </div>
      
      <!-- Área editable (Agregamos la clase 'sticky-content' y un color gris inicial) -->
      <div class="sticky-content" contenteditable="true" spellcheck="false" style="flex: 1; padding: 12px; outline: none; overflow-y: auto; font-size: 15px; line-height: 1.4; color: rgba(0,0,0,0.5);">Escribe aquí...</div>
      
      <!-- Efecto de esquina doblada -->
      <div style="position: absolute; bottom: 0; right: 0; border-width: 12px; border-style: solid; border-color: rgba(0,0,0,0.1) transparent transparent rgba(0,0,0,0.1); pointer-events: none;"></div>
    `;

    container.appendChild(stickyEl);

    // Centramos la nota al aparecer
    const containerRect = container.getBoundingClientRect();
    stickyEl.style.left = `${containerRect.width / 2 - 110}px`;

    // --- FUNCIONALIDAD INTERACTIVA ---

    // A. Cambiar Color en tiempo real
    const colorInput = stickyEl.querySelector('.color-picker') as HTMLInputElement;
    colorInput.addEventListener('input', (e) => {
      stickyEl.style.background = (e.target as HTMLInputElement).value;
    });

    // B. Cerrar (Eliminar) Nota
    const closeBtn = stickyEl.querySelector('.close-btn') as HTMLElement;
    closeBtn.addEventListener('click', () => {
      stickyEl.remove();
    });

    // C. Efecto de Placeholder ("Escribe aquí...")
    const textArea = stickyEl.querySelector('.sticky-content') as HTMLElement;

    // Al hacer clic (focus) borra el texto si es el de por defecto
    textArea.addEventListener('focus', () => {
      if (textArea.innerText.trim() === 'Escribe aquí...') {
        textArea.innerText = '';
        textArea.style.color = '#333'; // Cambia el color a oscuro para escribir
      }
    });

    // Al salir de la nota (blur) vuelve a poner el texto si la dejaste vacía
    textArea.addEventListener('blur', () => {
      if (textArea.innerText.trim() === '') {
        textArea.innerText = 'Escribe aquí...';
        textArea.style.color = 'rgba(0,0,0,0.5)'; // Regresa al color gris clarito
      }
    });

    // D. Arrastrar la nota
    const dragHandle = stickyEl.querySelector('.drag-handle') as HTMLElement;
    let isDragging = false;
    let startX = 0,
      startY = 0,
      initialLeft = 0,
      initialTop = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = stickyEl.offsetLeft;
      initialTop = stickyEl.offsetTop;
      dragHandle.style.cursor = 'grabbing';
      stickyEl.style.zIndex = '10000';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      stickyEl.style.left = `${initialLeft + dx}px`;
      stickyEl.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
        stickyEl.style.zIndex = '9999';
      }
    });
  }

  /** Inserta un contenedor colapsable usando <details>/<summary> nativo de HTML */
  insertCollapsible(): void {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    const html = `<details style="border:1px solid #e5e7eb;border-radius:6px;margin:8px 0;overflow:hidden" open>
         <summary style="background:#f9fafb;padding:8px 12px;cursor:pointer;
                         font-weight:600;list-style:none;display:flex;align-items:center;gap:6px;
                         border-radius:6px 6px 0 0;user-select:none;">
           ▶ Collapsible section
         </summary>
         <div style="padding:8px 12px;background:white;">
           <p>Add your content here...</p>
         </div>
       </details>`;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
    this.isInsertMenuOpen.set(false);
  }

  /** Inserta la fecha actual */
  insertDate(): void {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertText(
      pos,
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    );
    this.isInsertMenuOpen.set(false);
  }

  // ── Draw — Lienzo de dibujo ───────────────────────────────────────────────

  // ── Draw (lienzo de dibujo) ───────────────────────────────────────────────
  isDrawOpen = signal(false);
  private drawCanvas: HTMLCanvasElement | null = null;
  private drawCtx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  drawColor = signal('#000000'); // Color del lápiz

  // Tipamos el arreglo directamente aquí para no romper la clase
  drawTools: {
    id:
      | 'select'
      | 'rect'
      | 'diamond'
      | 'circle'
      | 'arrow'
      | 'line'
      | 'pen'
      | 'text'
      | 'image'
      | 'eraser'
      | 'shapes';
    icon: string;
    label: string;
  }[] = [
    { id: 'select', icon: 'near_me', label: 'Select' },
    { id: 'rect', icon: 'check_box_outline_blank', label: 'Rectangle' },
    { id: 'diamond', icon: 'diamond', label: 'Diamond' },
    { id: 'circle', icon: 'radio_button_unchecked', label: 'Circle' },
    { id: 'arrow', icon: 'east', label: 'Arrow' },
    { id: 'line', icon: 'horizontal_rule', label: 'Line' },
    { id: 'pen', icon: 'edit', label: 'Draw' },
    { id: 'text', icon: 'text_format', label: 'Text' },
    { id: 'image', icon: 'image', label: 'Insert Image' },
    { id: 'eraser', icon: 'ink_eraser', label: 'Eraser' },
    { id: 'shapes', icon: 'category', label: 'More Shapes' },
  ];

  // Usamos los mismos valores exactos en el signal
  drawTool = signal<
    | 'select'
    | 'rect'
    | 'diamond'
    | 'circle'
    | 'arrow'
    | 'line'
    | 'pen'
    | 'text'
    | 'image'
    | 'eraser'
    | 'shapes'
  >('pen');
  drawLineWidth = signal(2);

  /** Abre el overlay fullscreen de dibujo */
  openDraw(): void {
    this.isInsertMenuOpen.set(false);
    this.isDrawOpen.set(true);
    setTimeout(() => this.initDrawCanvas(), 80);
  }

  private initDrawCanvas(): void {
    this.drawCanvas = document.getElementById('draw-canvas') as HTMLCanvasElement;
    if (!this.drawCanvas) return;
    this.drawCtx = this.drawCanvas.getContext('2d')!;
    const container = this.drawCanvas.parentElement!;
    this.drawCanvas.width = container.clientWidth;
    this.drawCanvas.height = container.clientHeight;
    // Fondo blanco
    this.drawCtx.fillStyle = 'white';
    this.drawCtx.fillRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);

    // Eventos de dibujo
    this.drawCanvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.drawCanvas.addEventListener('mousemove', (e) => this.draw(e));
    this.drawCanvas.addEventListener('mouseup', () => this.stopDraw());
    this.drawCanvas.addEventListener('mouseleave', () => this.stopDraw());
  }

  private startDraw(e: MouseEvent): void {
    this.isDrawing = true;
    const tool = this.drawTool();

    if (tool === 'pen' || tool === 'eraser') {
      this.drawCtx!.beginPath();
      this.drawCtx!.moveTo(e.offsetX, e.offsetY);
    } else {
      // Para las formas, guardamos las coordenadas de inicio
      (this as any)._shapeStart = { x: e.offsetX, y: e.offsetY };
      // Y tomamos una "foto" del canvas para no dejar una estela al arrastrar
      (this as any)._snapshot = this.drawCtx!.getImageData(
        0,
        0,
        this.drawCanvas!.width,
        this.drawCanvas!.height,
      );
    }
  }

  private draw(e: MouseEvent): void {
    if (!this.isDrawing || !this.drawCtx) return;

    const tool = this.drawTool();
    this.drawCtx.lineWidth = this.drawLineWidth();
    this.drawCtx.lineCap = 'round';
    this.drawCtx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      // Dibujo libre
      this.drawCtx.strokeStyle = tool === 'eraser' ? 'white' : this.drawColor();
      // Si es borrador, lo hacemos más grueso
      if (tool === 'eraser') this.drawCtx.lineWidth = 15;

      this.drawCtx.lineTo(e.offsetX, e.offsetY);
      this.drawCtx.stroke();
    } else {
      // Dibujo de figuras (arrastrar y soltar)
      const start = (this as any)._shapeStart;
      if (!start) return;

      // Restauramos la "foto" del canvas para limpiar el fotograma anterior
      this.drawCtx.putImageData((this as any)._snapshot, 0, 0);

      this.drawCtx.beginPath();
      this.drawCtx.strokeStyle = this.drawColor();

      const w = e.offsetX - start.x;
      const h = e.offsetY - start.y;

      if (tool === 'rect') {
        this.drawCtx.rect(start.x, start.y, w, h);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(w * w + h * h);
        this.drawCtx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      } else if (tool === 'diamond') {
        this.drawCtx.moveTo(start.x + w / 2, start.y);
        this.drawCtx.lineTo(start.x + w, start.y + h / 2);
        this.drawCtx.lineTo(start.x + w / 2, start.y + h);
        this.drawCtx.lineTo(start.x, start.y + h / 2);
        this.drawCtx.closePath();
      } else if (tool === 'line' || tool === 'arrow') {
        this.drawCtx.moveTo(start.x, start.y);
        this.drawCtx.lineTo(e.offsetX, e.offsetY);
        // Nota: dibujar la punta de la flecha requiere trigonometría avanzada,
        // por ahora funcionará como línea recta para mantener el código ligero.
      }

      this.drawCtx.stroke();
    }
  }

  private stopDraw(): void {
    this.isDrawing = false;
  }

  /** Exporta el dibujo como imagen y lo inserta en el editor */
  saveDraw(): void {
    if (!this.drawCanvas) return;
    const dataUrl = this.drawCanvas.toDataURL('image/png');
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertEmbed(pos, 'image', dataUrl);
    this.quill?.setSelection(pos + 1);
    this.isDrawOpen.set(false);
  }

  /** Muestra confirmación de descarte del dibujo */
  async discardDraw(): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      title: 'Discard',
      text: 'Are you sure you want to discard the changes?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Discard',
      width: '340px',
      customClass: {
        popup: 'rounded-xl shadow-lg',
        confirmButton: 'px-5 py-2 rounded-lg font-medium text-white',
      },
    });
    if (isConfirmed) {
      this.isDrawOpen.set(false);
    }
  }

  // ── Code Language ─────────────────────────────────────────────────────────
  setLangContextual(lang: string): void {
    this.setCodeLanguage(lang);
  }

  // ── Varios ────────────────────────────────────────────────────────────────

  showComingSoon(feature: string): void {
    this.isInsertMenuOpen.set(false);
    Swal.fire({
      title: `<span class="text-[16px] font-bold">${feature}</span>`,
      html: '<span class="text-[14px] text-gray-500">This feature is coming soon.</span>',
      confirmButtonColor: '#18639c',
      confirmButtonText: 'OK',
      width: '340px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
      },
    });
  }

  // Alias para compatibilidad
  insertHorizontalLine() {
    this.insertHorizontalRule();
  }
  insertTime() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertText(
      pos,
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
    this.isInsertMenuOpen.set(false);
  }

  // ── Gestión de menús (toggle / close) ────────────────────────────────────

  /** Cierra absolutamente todos los menús desplegables */
  closeAllMenus(): void {
    this.isFontMenuOpen.set(false);
    this.isHeadingMenuOpen.set(false);
    this.isAlignMenuOpen.set(false);
    this.isColorMenuOpen.set(false);
    this.isInsertMenuOpen.set(false);
    this.isAaMenuOpen.set(false);
    this.isLangMenuOpen.set(false);
    this.isLinkPopupOpen.set(false);
  }

  /** Retorna la config de SweetAlert adaptada al modo oscuro activo */
  private getSwalTheme(): {
    background: string;
    color: string;
    inputBg: string;
    borderColor: string;
  } {
    const isDark = document.documentElement.classList.contains('dark');
    return isDark
      ? { background: '#1f2937', color: '#f9fafb', inputBg: '#374151', borderColor: '#4b5563' }
      : { background: '#ffffff', color: '#111827', inputBg: '#f9fafb', borderColor: '#d1d5db' };
  }

  toggleFontMenu(event: MouseEvent) {
    const val = !this.isFontMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.fontMenuPos.set(this.getPos(event));
      this.isFontMenuOpen.set(true);
    }
  }
  toggleHeadingMenu(event: MouseEvent) {
    const val = !this.isHeadingMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.headingMenuPos.set(this.getPos(event));
      this.isHeadingMenuOpen.set(true);
    }
  }
  toggleAlignMenu(event: MouseEvent) {
    const val = !this.isAlignMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.alignMenuPos.set(this.getPos(event));
      this.isAlignMenuOpen.set(true);
    }
  }
  toggleColorMenu(event: MouseEvent) {
    const val = !this.isColorMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.colorMenuPos.set(this.getPos(event));
      this.isColorMenuOpen.set(true);
    }
  }
  toggleInsertMenu(event: MouseEvent) {
    const val = !this.isInsertMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.insertMenuPos.set(this.getPos(event));
      this.isInsertMenuOpen.set(true);
    }
  }
  toggleAaMenu(event: MouseEvent) {
    const val = !this.isAaMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.aaMenuPos.set(this.getPos(event));
      this.isAaMenuOpen.set(true);
    }
  }
  toggleLangMenu(event: MouseEvent) {
    const val = !this.isLangMenuOpen();
    this.closeAllMenus();
    if (val) {
      this.langMenuPos.set(this.getPos(event));
      this.isLangMenuOpen.set(true);
    }
  }

  /**
   * CORRECCIÓN: Cierra todos los menús si el clic ocurre fuera del componente host.
   * Cubre sidebar, topbar, canvas del editor — cualquier área exterior al toolbar.
   */
  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(event: Event): void {
    const hostEl = this._elementRef.nativeElement as HTMLElement;
    if (hostEl && !hostEl.contains(event.target as Node)) {
      this.closeAllMenus();
    }
  }
}

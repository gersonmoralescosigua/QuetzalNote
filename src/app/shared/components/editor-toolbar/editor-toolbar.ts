import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { NotesService } from '../../../core/services/notes.service';

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];
const FONTS = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const COLORS = [
  '#000000','#434343','#666666','#999999','#cccccc','#ffffff',
  '#ff0000','#ff4500','#ff9900','#ffff00','#00ff00','#00ffff',
  '#4a86e8','#0000ff','#9900ff','#ff00ff','#ea9999','#f9cb9c',
  '#ffe599','#b6d7a8','#a2c4c9','#9fc5e8','#b4a7d6','#ea99d5',
  '#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6fa8dc',
  '#8e7cc3','#c27ba0','#cc0000','#e69138','#f1c232','#6aa84f',
];

interface MenuPos { top: number; left: number; }

@Component({
  selector: 'app-editor-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-toolbar.html',
  styleUrl: './editor-toolbar.scss',
})
export class EditorToolbar {
  private notesService = inject(NotesService);
  private quill: any = null;

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

  isFontMenuOpen = signal(false);
  isHeadingMenuOpen = signal(false);
  isAlignMenuOpen = signal(false);
  isColorMenuOpen = signal(false);
  isInsertMenuOpen = signal(false);

  fontMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  headingMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  colorMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  alignMenuPos = signal<MenuPos>({ top: 0, left: 0 });
  insertMenuPos = signal<MenuPos>({ top: 0, left: 0 });

  fonts = FONTS;
  colors = COLORS;

  constructor() {
    effect(() => {
      const q = this.notesService.quillInstance();
      if (q && q !== this.quill) {
        this.quill = q;
        this.quill.on('selection-change', () => this.updateFormats());
        this.quill.on('text-change', () => this.updateFormats());
      }
    });
  }

  private updateFormats() {
    if (!this.quill) return;
    const format = this.quill.getFormat();
    this.isBold.set(!!format['bold']);
    this.isItalic.set(!!format['italic']);
    this.isUnderline.set(!!format['underline']);
    this.isCode.set(!!format['code-block']);
    this.currentHeading.set(format['header'] || false);
    this.currentList.set((format['list'] as 'ordered' | 'bullet' | 'check') || false);
    this.isBlockquote.set(!!format['blockquote']);
    this.currentAlign.set(format['align'] || 'left');
    this.currentColor.set(format['color'] || '#000000');
    if (format['font']) {
      this.currentFont.set((format['font'] as string).replace(/['"]/g, '').trim());
    }
    if (format['size']) {
      const num = parseInt(format['size'] as string);
      if (!isNaN(num)) this.fontSize.set(num);
    }
  }

  private getPos(event: MouseEvent): MenuPos {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }

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

  undo() { this.quill?.getModule('history')?.undo(); }
  redo() { this.quill?.getModule('history')?.redo(); }

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

  setHeading(level: number | false) {
    this.quill?.format('header', level || false);
    // Limpiar otros formatos de bloque mutuamente exclusivos
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
    const newVal = current === type ? false : type;
    this.quill?.format('list', newVal || false);
    if (newVal) {
      this.quill?.format('header', false);
      this.quill?.format('blockquote', false);
      this.quill?.format('code-block', false);
    }
    this.currentList.set(newVal);
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

  setFont(font: string) {
    this.quill?.format('font', font);
    this.currentFont.set(font);
    this.isFontMenuOpen.set(false);
  }

  setAlign(align: string) {
    // 'left' es el valor por defecto de Quill — se limpia con false
    this.quill?.format('align', align === 'left' ? false : align);
    this.currentAlign.set(align);
    this.isAlignMenuOpen.set(false);
  }

  setColor(color: string) {
    this.quill?.format('color', color);
    this.currentColor.set(color);
    this.isColorMenuOpen.set(false);
  }

  async insertLink() {
    const savedRange = this.quill?.getSelection();
    const { value: url } = await Swal.fire({
      title: '<span class="text-[16px] font-bold">Insert Link</span>',
      input: 'url',
      inputPlaceholder: 'https://...',
      showCancelButton: true,
      confirmButtonColor: '#18639c',
      cancelButtonColor: '#f3f4f6',
      confirmButtonText: 'Insert',
      cancelButtonText: '<span class="text-gray-700">Cancel</span>',
      width: '400px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton: 'px-5 py-2 rounded-md font-medium',
      },
    });
    if (!url) return;
    if (savedRange && savedRange.length > 0) {
      this.quill?.formatText(savedRange.index, savedRange.length, 'link', url);
    } else {
      const pos = savedRange?.index ?? this.quill?.getLength() ?? 0;
      this.quill?.insertText(pos, url, 'link', url);
      this.quill?.setSelection(pos + url.length);
    }
  }

  insertHorizontalRule() {
    const range = this.quill?.getSelection(true);
    const pos = range?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertEmbed(pos, 'hr', true);
    this.quill?.setSelection(pos + 1);
    this.isInsertMenuOpen.set(false);
  }

  insertPageBreak() {
    const range = this.quill?.getSelection(true);
    const pos = range?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertEmbed(pos, 'page-break', true);
    this.quill?.setSelection(pos + 1);
    this.isInsertMenuOpen.set(false);
  }

  insertImage() {
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
        this.quill?.setSelection(pos + 1);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  insertTable() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    const td = 'border:1px solid #d1d5db;padding:6px 10px;min-width:80px;';
    const tableHTML =
      `<table style="border-collapse:collapse;width:100%;margin:8px 0;">` +
      `<tbody>` +
      `<tr><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td></tr>` +
      `<tr><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td></tr>` +
      `<tr><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td><td style="${td}">&nbsp;</td></tr>` +
      `</tbody></table>`;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, tableHTML);
    this.isInsertMenuOpen.set(false);
  }

  insertStickyNote() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    const html =
      `<blockquote style="background:#fef9c3;border-left:4px solid #facc15;` +
      `padding:10px 14px;margin:8px 0;border-radius:4px;color:#713f12;">` +
      `📝 Sticky Note</blockquote>`;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
    this.isInsertMenuOpen.set(false);
  }

  insertCollapsible() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    const html =
      `<div style="border:1px solid #e5e7eb;border-radius:6px;margin:8px 0;">` +
      `<div style="background:#f9fafb;padding:8px 12px;font-weight:600;border-radius:6px 6px 0 0;">` +
      `▶ Collapsible section</div>` +
      `<div style="padding:8px 12px;">Add your content here...</div></div>`;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
    this.isInsertMenuOpen.set(false);
  }

  async insertEquation() {
    this.isInsertMenuOpen.set(false);
    const savedRange = this.quill?.getSelection();
    const { value } = await Swal.fire({
      title: '<span class="text-[16px] font-bold">Insert Equation</span>',
      input: 'text',
      inputPlaceholder: 'e.g.  E = mc²',
      showCancelButton: true,
      confirmButtonColor: '#18639c',
      cancelButtonColor: '#f3f4f6',
      confirmButtonText: 'Insert',
      cancelButtonText: '<span class="text-gray-700">Cancel</span>',
      width: '400px',
      customClass: {
        popup: 'rounded-xl shadow-lg border border-gray-100',
        confirmButton: 'px-5 py-2 rounded-md font-medium',
        cancelButton: 'px-5 py-2 rounded-md font-medium',
      },
    });
    if (!value) return;
    const pos = savedRange?.index ?? this.quill?.getLength() ?? 0;
    const html = `<span style="font-family:serif;font-style:italic;font-size:1.1em;">${value}</span>`;
    this.quill?.clipboard.dangerouslyPasteHTML(pos, html);
  }

  insertDate() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertText(pos, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    this.isInsertMenuOpen.set(false);
  }

  // Método conservado internamente (no aparece en el menú nuevo)
  insertTime() {
    const pos = this.quill?.getSelection(true)?.index ?? this.quill?.getLength() ?? 0;
    this.quill?.insertText(pos, new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    this.isInsertMenuOpen.set(false);
  }

  // Horizontal Rule — alias para compatibilidad
  insertHorizontalLine() { this.insertHorizontalRule(); }

  showComingSoon(feature: string) {
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

  closeAllMenus() {
    this.isFontMenuOpen.set(false);
    this.isHeadingMenuOpen.set(false);
    this.isAlignMenuOpen.set(false);
    this.isColorMenuOpen.set(false);
    this.isInsertMenuOpen.set(false);
  }

  toggleFontMenu(event: MouseEvent) {
    const val = !this.isFontMenuOpen();
    this.closeAllMenus();
    if (val) { this.fontMenuPos.set(this.getPos(event)); this.isFontMenuOpen.set(true); }
  }

  toggleHeadingMenu(event: MouseEvent) {
    const val = !this.isHeadingMenuOpen();
    this.closeAllMenus();
    if (val) { this.headingMenuPos.set(this.getPos(event)); this.isHeadingMenuOpen.set(true); }
  }

  toggleAlignMenu(event: MouseEvent) {
    const val = !this.isAlignMenuOpen();
    this.closeAllMenus();
    if (val) { this.alignMenuPos.set(this.getPos(event)); this.isAlignMenuOpen.set(true); }
  }

  toggleColorMenu(event: MouseEvent) {
    const val = !this.isColorMenuOpen();
    this.closeAllMenus();
    if (val) { this.colorMenuPos.set(this.getPos(event)); this.isColorMenuOpen.set(true); }
  }

  toggleInsertMenu(event: MouseEvent) {
    const val = !this.isInsertMenuOpen();
    this.closeAllMenus();
    if (val) { this.insertMenuPos.set(this.getPos(event)); this.isInsertMenuOpen.set(true); }
  }
}

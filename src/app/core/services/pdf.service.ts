import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

/**
 * pdf.service.ts
 * Responsable de toda la lógica de conversión de contenido a PDF y WORD.
 * Mantiene la lógica desacoplada del componente de layout (arquitectura §6 Blueprint).
 *
 * Métodos disponibles:
 *  - convertTextToPdf(text)     → Convierte texto plano a PDF (método original)
 *  - convertHtmlToPdf(html, fileName) → Convierte HTML del editor Quill a PDF
 *  - convertToWord(html, fileName)    → Exporta HTML como documento Word (.doc)
 *  - extractTextFromDocx(file)  → Extrae texto de un .docx con mammoth.js
 *  - getSampleText()            → Texto de muestra para el conversor
 *
 * Responsable: Isidro (core/services/)
 */
@Injectable({
  providedIn: 'root',
})
export class PdfService {
  // texto plano → pdf

  /**
   * Convierte texto plano a un documento PDF y lo descarga automáticamente.
   * Respeta saltos de línea del usuario, aplica márgenes estándar A4
   * y genera saltos de página automáticos cuando el contenido supera la altura.
   *
   * @param text Texto a convertir. Si está vacío, lanza un error.
   * @throws Error si el texto está vacío o si falla la generación.
   */
  convertTextToPdf(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('NO_CONTENT');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 20;
    const marginY = 20;
    const maxW = pageW - marginX * 2;
    const lineH = 7; // mm entre líneas

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    const paragraphs = trimmed.split('\n');
    let y = marginY;

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        // Línea en blanco → espacio entre párrafos
        y += lineH * 0.5;
        if (y > pageH - marginY) {
          doc.addPage();
          y = marginY;
        }
        continue;
      }

      const lines = doc.splitTextToSize(paragraph, maxW);
      for (const line of lines) {
        if (y + lineH > pageH - marginY) {
          doc.addPage();
          y = marginY;
        }
        doc.text(line, marginX, y);
        y += lineH;
      }
      y += lineH * 0.3; // pequeño espacio entre párrafos
    }

    // Nombre del archivo: primera línea del texto, máx 40 chars
    const firstLine =
      trimmed
        .split('\n')[0]
        .replace(/[^\w\s-]/g, '')
        .trim()
        .substring(0, 40) || 'document';

    doc.save(`${firstLine}.pdf`);
  }

  // html (quill) → pdf

  /**
   * Convierte el HTML del editor Quill a PDF abriendo una ventana de impresión.
   * Esto preserva todo el formato del editor: tablas, negritas, listas, imágenes.
   *
   * @param html     innerHTML del editor Quill
   * @param fileName Nombre del archivo sin extensión
   */
  convertHtmlToPdf(html: string, fileName: string): void {
    const trimmed = html?.trim() || '';
    if (!trimmed || trimmed === '<p><br></p>') {
      throw new Error('NO_CONTENT');
    }

    // LÓGICA: Abrimos una ventana nueva con el HTML estilizado
    // y llamamos a window.print() que permite guardar como PDF en el navegador.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('NO_POPUP');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>${fileName}</title>
        <style>
          /* ── Reset ── */
          * { margin: 0; padding: 0; box-sizing: border-box; }

          /* ── Estilos de página ── */
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #1f2937;
            padding: 20mm;
            background: white;
          }

          /* ── Tipografía ── */
          h1 { font-size: 24pt; margin: 12pt 0 6pt; }
          h2 { font-size: 18pt; margin: 10pt 0 5pt; }
          h3 { font-size: 14pt; margin: 8pt 0 4pt; }
          p  { margin-bottom: 8pt; }
          a  { color: #18639c; }

          /* ── Listas ── */
          ul, ol { padding-left: 20pt; margin-bottom: 8pt; }
          li { margin-bottom: 3pt; }

          /* ── Tablas ── */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 10pt 0;
          }
          td, th {
            border: 1px solid #d1d5db;
            padding: 6pt 10pt;
            text-align: left;
          }
          th { background: #f3f4f6; font-weight: bold; }

          /* ── Código ── */
          pre, code {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4pt;
            padding: 2pt 4pt;
          }
          pre { padding: 8pt 12pt; margin: 8pt 0; display: block; }

          /* ── Blockquote ── */
          blockquote {
            border-left: 4pt solid #18639c;
            margin: 8pt 0;
            padding: 4pt 12pt;
            color: #4b5563;
          }

          /* ── Imágenes ── */
          img { max-width: 100%; height: auto; }

          /* ── Print ── */
          @media print {
            body { padding: 0; }
            @page { margin: 20mm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    // LÓGICA: Esperamos un momento para que el contenido cargue
    // (especialmente si hay imágenes base64 grandes)
    setTimeout(() => {
      printWindow.print();
      // No cerramos automáticamente para que el usuario pueda guardar el PDF
    }, 500);
  }

  // html → word

  /**
   * Exporta el HTML del editor como documento Word (.doc/.docx).
   * Usa html-docx-js si está disponible (cargado en index.html),
   * si no, crea un archivo .doc con el HTML embebido (compatible con Word).
   *
   * @param html     innerHTML del editor Quill
   * @param fileName Nombre del archivo sin extensión
   */
  convertToWord(html: string, fileName: string): void {
    const trimmed = html?.trim() || '';
    if (!trimmed || trimmed === '<p><br></p>') {
      throw new Error('NO_CONTENT');
    }

    // Envolver en HTML completo con estilos básicos de Word
    const fullHtml = `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12pt; margin: 20mm; line-height: 1.6; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #d1d5db; padding: 6pt 10pt; }
          h1 { font-size: 24pt; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
          blockquote { border-left: 4pt solid #18639c; padding-left: 12pt; color: #4b5563; }
          pre, code { font-family: 'Courier New', monospace; font-size: 10pt; background: #f9fafb; padding: 4pt; }
        </style>
      </head>
      <body>${trimmed}</body>
      </html>
    `;

    // LÓGICA: Intentar con html-docx-js si está cargado
    const htmlDocx = (window as any).htmlDocx;
    if (htmlDocx && typeof htmlDocx.asBlob === 'function') {
      const blob = htmlDocx.asBlob(fullHtml);
      this.downloadBlob(
        blob,
        `${fileName}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    } else {
      // Fallback: exportar como .doc (HTML with Word namespace — abre en Word)
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      this.downloadBlob(blob, `${fileName}.doc`, 'application/msword');
    }
  }

  // docx → texto

  /**
   * Extrae texto plano de un archivo .docx usando mammoth.js (cargado globalmente).
   * Devuelve el texto extraído o lanza un error si falla.
   *
   * @param file Archivo .docx seleccionado por el usuario.
   * @returns Promesa con el texto extraído.
   */
  async extractTextFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = (window as any).mammoth;
    if (!mammoth) {
      throw new Error('mammoth.js no está disponible');
    }
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  /**
   * Extrae HTML de un archivo .docx preservando el formato.
   * Útil para importar a Quill manteniendo negritas, listas, etc.
   *
   * @param file Archivo .docx seleccionado por el usuario.
   * @returns Promesa con el HTML extraído.
   */
  async extractHtmlFromDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = (window as any).mammoth;
    if (!mammoth) {
      throw new Error('mammoth.js no está disponible');
    }
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || '';
  }

  // texto de muestra

  /**
   * Devuelve un texto de muestra para mostrar en el textarea del conversor PDF.
   */
  getSampleText(): string {
    return (
      'Sample Document\n\n' +
      'This is a sample document to demonstrate the Text to PDF converter.\n\n' +
      'You can replace this content with your own text. The converter supports:\n' +
      '- Multiple paragraphs\n' +
      '- Automatic line wrapping\n' +
      '- Multi-page documents\n\n' +
      'Simply click "Convert to PDF" to generate and download your document.'
    );
  }

  // utilidades privadas

  /** Descarga un Blob como archivo en el navegador */
  private downloadBlob(blob: Blob, fileName: string, mimeType: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

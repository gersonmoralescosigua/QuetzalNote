import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

/**
 * PdfService
 * Responsable de toda la lógica de conversión de texto a PDF.
 * Mantiene la lógica desacoplada del componente de layout (arquitectura: §6 Blueprint).
 *
 * Responsable: Isidro (core/services/)
 */
@Injectable({
  providedIn: 'root',
})
export class PdfService {

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
    const maxW    = pageW - marginX * 2;
    const lineH   = 7; // mm entre líneas

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    const paragraphs = trimmed.split('\n');
    let y = marginY;

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        // Línea en blanco → espacio entre párrafos
        y += lineH * 0.5;
        if (y > pageH - marginY) { doc.addPage(); y = marginY; }
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
    const firstLine = trimmed.split('\n')[0]
      .replace(/[^\w\s-]/g, '')
      .trim()
      .substring(0, 40) || 'document';

    doc.save(`${firstLine}.pdf`);
  }

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
}

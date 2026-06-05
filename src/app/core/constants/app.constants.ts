// app.constants.ts — constantes globales reutilizables (URLs, timeouts, límites).
/**
 * app.constants.ts
 * Constantes globales de la aplicación QuetzalNote.
 * Centraliza valores reutilizables para evitar "magic numbers/strings"
 * dispersos en el código.
 *
 * Responsable: Isidro (lógica) / Gerson (constantes visuales)
 *
 */

// firebase

/** Nodos raíz de Firebase Realtime Database */
export const FIREBASE_NODES = {
  NOTAS:    'notas',
  FEEDBACK: 'feedback',
} as const;

// autosave

/** Tiempo de espera (ms) antes de guardar automáticamente tras el último cambio */
export const AUTOSAVE_DELAY_MS = 1000;

// editor

/** Título por defecto al crear una nota nueva */
export const DEFAULT_NOTE_TITLE = 'Untitled Document';

/** Clave de localStorage para persistir la última nota abierta */
export const LAST_NOTE_ID_KEY = 'qn_lastNoteId';

/** Clave de localStorage para persistir la preferencia de tema */
export const THEME_KEY = 'theme';

// pdf

/** Máximo de caracteres del nombre de archivo al exportar PDF */
export const PDF_FILENAME_MAX_CHARS = 40;

/** Márgenes del documento PDF en milímetros */
export const PDF_MARGIN_MM = 20;

/** Altura de línea del documento PDF en milímetros */
export const PDF_LINE_HEIGHT_MM = 7;

/** Tamaño de fuente por defecto en el PDF en puntos */
export const PDF_DEFAULT_FONT_SIZE = 12;

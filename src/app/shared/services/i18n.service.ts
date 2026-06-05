import { Injectable, signal } from '@angular/core';

/**
 * i18n.service.ts
 * Servicio de internacionalización ligero para QuetzalNote.
 * NO usa el módulo @angular/localize (requeriría rebuilds por idioma).
 * En su lugar mantiene un diccionario en memoria y un Signal reactivo.
 *
 * Uso:
 *   i18n = inject(I18nService);
 *   {{ i18n.t('newNote') }}
 *   (click)="i18n.setLanguage('es')"
 *
 * Para agregar un idioma:
 *   1. Añadir su código al tipo Language
 *   2. Añadir su objeto en TRANSLATIONS
 *   3. Añadir su entrada en LANGUAGES
 *
 * Responsable: Gerson (shared/services/)
 */

// tipos

/** Códigos ISO 639-1 de los idiomas soportados */
export type Language = 'en' | 'es' | 'fr' | 'pt';

/** Diccionario completo de traducciones por idioma */
const TRANSLATIONS: Record<Language, Record<string, string>> = {
  // inglés
  en: {
    // Sidebar
    newNote: 'New Note',
    notes: 'Notes',
    viewAll: 'View all',
    otherTools: 'Other Tools',
    paraphraser: 'Paraphraser',
    textToPdf: 'Text to PDF',
    other: 'Other',
    feedback: 'Feedback',
    trash: 'Trash',
    more: 'More',
    settings: 'Settings',
    appleStore: 'Apple Store',
    playStore: 'Play Store',
    changeLog: 'Change Log',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    aboutTool: 'About this tool',
    // Topbar
    searchNotes: 'Search Notes...',
    searchPlaceholder: 'Search...',
    saving: 'Saving',
    saved: 'Saved',
    // Editor
    untitledDocument: 'Untitled Document',
    helpMeWrite: 'Help me write',
    uploadDoc: 'Upload Doc',
    words: 'Words',
    characters: 'Characters',
    // Empty state
    selectNote: 'Select a note to get started',
    createNewSidebar: 'or create a new one from the sidebar',
    // Loader
    loadingNotes: 'Loading notes...',
    // Auth
    signIn: 'Sign in',
    signOut: 'Sign out',
    contactUs: 'Contact Us',
    siteLanguage: 'Site Language',
    // PDF
    textToPdfTitle: 'Text to PDF Converter',
    convertToPdf: 'Convert to PDF',
    converting: 'Converting...',
    sampleDocument: 'Sample Document',
    enterTextPdf: 'Enter or paste your text here to convert it to PDF...',
    // Paraphraser
    paraphraserTitle: 'Paraphraser',
    paraphraseBtn: 'Paraphrase',
    paraphrasing: 'Paraphrasing...',
    originalText: 'Original text',
    paraphrasedText: 'Paraphrased text',
    pasteToParaphrase: 'Paste or type the text you want to paraphrase...',
    resultHere: 'The paraphrased result will appear here...',
    copyResult: 'Copy result',
    copied: 'Copied!',
    useInEditor: 'Use in Editor',
    clear: 'Clear',
    processing: 'Processing...',
  },

  // español
  es: {
    newNote: 'Nueva Nota',
    notes: 'Notas',
    viewAll: 'Ver todo',
    otherTools: 'Otras Herramientas',
    paraphraser: 'Parafraseador',
    textToPdf: 'Texto a PDF',
    other: 'Otro',
    feedback: 'Comentarios',
    trash: 'Papelera',
    more: 'Más',
    settings: 'Configuración',
    appleStore: 'Apple Store',
    playStore: 'Play Store',
    changeLog: 'Registro de cambios',
    privacyPolicy: 'Política de privacidad',
    termsOfUse: 'Términos de uso',
    aboutTool: 'Acerca de esta herramienta',
    searchNotes: 'Buscar notas...',
    searchPlaceholder: 'Buscar...',
    saving: 'Guardando',
    saved: 'Guardado',
    untitledDocument: 'Documento sin título',
    helpMeWrite: 'Ayúdame a escribir',
    uploadDoc: 'Subir documento',
    words: 'Palabras',
    characters: 'Caracteres',
    selectNote: 'Selecciona una nota para empezar',
    createNewSidebar: 'o crea una nueva desde el panel lateral',
    loadingNotes: 'Cargando notas...',
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    contactUs: 'Contáctanos',
    siteLanguage: 'Idioma del sitio',
    textToPdfTitle: 'Convertidor de Texto a PDF',
    convertToPdf: 'Convertir a PDF',
    converting: 'Convirtiendo...',
    sampleDocument: 'Documento de muestra',
    enterTextPdf: 'Ingresa o pega tu texto aquí para convertirlo a PDF...',
    paraphraserTitle: 'Parafraseador',
    paraphraseBtn: 'Parafrasear',
    paraphrasing: 'Parafraseando...',
    originalText: 'Texto original',
    paraphrasedText: 'Texto parafraseado',
    pasteToParaphrase: 'Pega o escribe el texto que quieres parafrasear...',
    resultHere: 'El resultado aparecerá aquí...',
    copyResult: 'Copiar resultado',
    copied: '¡Copiado!',
    useInEditor: 'Usar en Editor',
    clear: 'Limpiar',
    processing: 'Procesando...',
  },

  // francés
  fr: {
    newNote: 'Nouvelle Note',
    notes: 'Notes',
    viewAll: 'Voir tout',
    otherTools: 'Autres Outils',
    paraphraser: 'Paraphraseur',
    textToPdf: 'Texte en PDF',
    other: 'Autre',
    feedback: 'Commentaires',
    trash: 'Corbeille',
    more: 'Plus',
    settings: 'Paramètres',
    appleStore: 'Apple Store',
    playStore: 'Play Store',
    changeLog: 'Journal des modifications',
    privacyPolicy: 'Politique de confidentialité',
    termsOfUse: "Conditions d'utilisation",
    aboutTool: 'À propos de cet outil',
    searchNotes: 'Rechercher des notes...',
    searchPlaceholder: 'Rechercher...',
    saving: 'Sauvegarde',
    saved: 'Sauvegardé',
    untitledDocument: 'Document sans titre',
    helpMeWrite: 'Aidez-moi à écrire',
    uploadDoc: 'Télécharger un document',
    words: 'Mots',
    characters: 'Caractères',
    selectNote: 'Sélectionnez une note pour commencer',
    createNewSidebar: 'ou créez-en une nouvelle depuis le panneau',
    loadingNotes: 'Chargement des notes...',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    contactUs: 'Contactez-nous',
    siteLanguage: 'Langue du site',
    textToPdfTitle: 'Convertisseur Texte en PDF',
    convertToPdf: 'Convertir en PDF',
    converting: 'Conversion...',
    sampleDocument: 'Document exemple',
    enterTextPdf: 'Entrez ou collez votre texte ici pour le convertir en PDF...',
    paraphraserTitle: 'Paraphraseur',
    paraphraseBtn: 'Paraphraser',
    paraphrasing: 'Paraphrase en cours...',
    originalText: 'Texte original',
    paraphrasedText: 'Texte paraphrasé',
    pasteToParaphrase: 'Collez ou saisissez le texte à paraphraser...',
    resultHere: 'Le résultat apparaîtra ici...',
    copyResult: 'Copier le résultat',
    copied: 'Copié !',
    useInEditor: "Utiliser dans l'éditeur",
    clear: 'Effacer',
    processing: 'Traitement...',
  },

  // portugués
  pt: {
    newNote: 'Nova Nota',
    notes: 'Notas',
    viewAll: 'Ver tudo',
    otherTools: 'Outras Ferramentas',
    paraphraser: 'Parafraseador',
    textToPdf: 'Texto para PDF',
    other: 'Outro',
    feedback: 'Comentários',
    trash: 'Lixeira',
    more: 'Mais',
    settings: 'Configurações',
    appleStore: 'Apple Store',
    playStore: 'Play Store',
    changeLog: 'Registro de alterações',
    privacyPolicy: 'Política de privacidade',
    termsOfUse: 'Termos de uso',
    aboutTool: 'Sobre esta ferramenta',
    searchNotes: 'Pesquisar notas...',
    searchPlaceholder: 'Pesquisar...',
    saving: 'Salvando',
    saved: 'Salvo',
    untitledDocument: 'Documento sem título',
    helpMeWrite: 'Me ajude a escrever',
    uploadDoc: 'Carregar documento',
    words: 'Palavras',
    characters: 'Caracteres',
    selectNote: 'Selecione uma nota para começar',
    createNewSidebar: 'ou crie uma nova na barra lateral',
    loadingNotes: 'Carregando notas...',
    signIn: 'Entrar',
    signOut: 'Sair',
    contactUs: 'Fale conosco',
    siteLanguage: 'Idioma do site',
    textToPdfTitle: 'Conversor de Texto para PDF',
    convertToPdf: 'Converter para PDF',
    converting: 'Convertendo...',
    sampleDocument: 'Documento de exemplo',
    enterTextPdf: 'Digite ou cole seu texto aqui para converter em PDF...',
    paraphraserTitle: 'Parafraseador',
    paraphraseBtn: 'Parafrasear',
    paraphrasing: 'Parafraseando...',
    originalText: 'Texto original',
    paraphrasedText: 'Texto parafraseado',
    pasteToParaphrase: 'Cole ou digite o texto que deseja parafrasear...',
    resultHere: 'O resultado aparecerá aqui...',
    copyResult: 'Copiar resultado',
    copied: 'Copiado!',
    useInEditor: 'Usar no Editor',
    clear: 'Limpar',
    processing: 'Processando...',
  },
};

// servicio

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  /** Idioma activo. Se persiste en localStorage bajo la clave 'qn_lang'. */
  readonly currentLang = signal<Language>((localStorage.getItem('qn_lang') as Language) || 'en');

  /** Metadata de los idiomas soportados para iterar en el menú de idiomas */
  readonly LANGUAGES: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
  ];

  /**
   * Cambia el idioma activo y lo persiste en localStorage.
   * El cambio es reactivo: todos los componentes que usan t() se actualizan.
   */
  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    localStorage.setItem('qn_lang', lang);
  }

  /**
   * Retorna la traducción de una clave en el idioma activo.
   * Si la clave no existe, retorna la clave misma como fallback visible.
   *
   * @param key  Clave del diccionario (ej: 'newNote')
   * @returns    Texto traducido (ej: 'Nueva Nota' en español)
   */
  t(key: string): string {
    return TRANSLATIONS[this.currentLang()][key] ?? key;
  }

  /** Retorna el label del idioma activo (para mostrar en el botón) */
  currentLangLabel(): string {
    return this.LANGUAGES.find((l) => l.code === this.currentLang())?.label ?? 'English';
  }
}

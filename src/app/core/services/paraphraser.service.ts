// paraphraser.service.ts
// Lógica de parafraseo por sustitución léxica.
// Desacoplada del componente para mantener la responsabilidad del servicio.
// Responsable: Isidro
import { Injectable } from '@angular/core';

// Diccionario de sinónimos — cada entrada mapea una palabra a sus alternativas
const SYNONYM_MAP: Record<string, string[]> = {
  good:      ['excellent', 'great', 'fine', 'outstanding'],
  bad:       ['poor', 'terrible', 'inadequate', 'inferior'],
  big:       ['large', 'enormous', 'substantial', 'considerable'],
  small:     ['tiny', 'minor', 'compact', 'modest'],
  important: ['crucial', 'essential', 'significant', 'vital'],
  use:       ['utilize', 'employ', 'apply', 'leverage'],
  make:      ['create', 'produce', 'generate', 'develop'],
  get:       ['obtain', 'acquire', 'receive', 'gain'],
  show:      ['demonstrate', 'illustrate', 'display', 'reveal'],
  help:      ['assist', 'support', 'aid', 'facilitate'],
  need:      ['require', 'demand', 'necessitate', 'call for'],
  want:      ['desire', 'seek', 'wish for', 'aim for'],
  think:     ['consider', 'believe', 'conclude', 'determine'],
  know:      ['understand', 'recognize', 'realize', 'comprehend'],
  see:       ['observe', 'notice', 'perceive', 'identify'],
  work:      ['function', 'operate', 'perform', 'execute'],
  start:     ['begin', 'initiate', 'commence', 'launch'],
  end:       ['conclude', 'finish', 'terminate', 'complete'],
  change:    ['modify', 'alter', 'transform', 'adjust'],
  keep:      ['maintain', 'preserve', 'retain', 'sustain'],
  give:      ['provide', 'offer', 'supply', 'deliver'],
  take:      ['obtain', 'acquire', 'retrieve', 'extract'],
  say:       ['state', 'mention', 'express', 'indicate'],
  find:      ['discover', 'identify', 'locate', 'uncover'],
  very:      ['extremely', 'highly', 'particularly', 'significantly'],
  also:      ['additionally', 'furthermore', 'moreover', 'likewise'],
  but:       ['however', 'nevertheless', 'yet', 'although'],
  because:   ['since', 'as', 'given that', 'due to the fact that'],
  so:        ['therefore', 'consequently', 'thus', 'as a result'],
};

@Injectable({
  providedIn: 'root',
})
export class ParaphraserService {

  paraphrase(text: string): string {
    if (!text.trim()) return '';
    return this.applyLexicalSubstitution(text);
  }

  // Tokeniza por límites de palabra y reemplaza las que están en el diccionario,
  // preservando la capitalización original
  private applyLexicalSubstitution(text: string): string {
    return text.replace(/\b([a-zA-Z]+)\b/g, (match) => {
      const lower = match.toLowerCase();
      const synonyms = SYNONYM_MAP[lower];
      if (!synonyms) return match;

      const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
      const isCapitalized =
        match[0] === match[0].toUpperCase() &&
        match[0].toLowerCase() !== match[0].toUpperCase();

      return isCapitalized
        ? synonym.charAt(0).toUpperCase() + synonym.slice(1)
        : synonym;
    });
  }
}

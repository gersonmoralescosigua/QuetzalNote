import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// ════════════════════════════════════════════════════════════════════════════
// PARCHE GLOBAL: evita que Quill "robe" el foco a campos externos
// (título del topbar, buscador Ctrl+K, feedback, modales de Insertar
// Tabla/Ecuación, sticky notes...).
//
// ANÁLISIS DEL PROBLEMA
// ─────────────────────
// Quill, internamente, fuerza su propio foco cada vez que se le pide la
// selección "con foco" (quill.getSelection(true)) o se le asigna una nueva
// selección (quill.setSelection(...)) — algo que el código de esta app hace
// constantemente al insertar tablas, ecuaciones, fechas, listas colapsables,
// etc. (ver editor-toolbar.ts, múltiples `getSelection(true)` / `setSelection`).
// Internamente Quill ejecuta algo equivalente a:
//     if (!this.hasFocus()) this.root.focus({ preventScroll: true });
// y `hasFocus()` solo es `true` si `document.activeElement` está DENTRO de
// `.ql-editor`. Es decir: en cuanto el usuario hace foco en un campo externo
// y, en el medio, se dispara cualquier lógica que llame a getSelection(true)
// o setSelection(...), Quill literalmente vuelve a invocar `.focus()` sobre sí
// mismo — sin que ningún `stopPropagation()` de eventos de teclado pueda
// evitarlo, porque el robo de foco ocurre vía `HTMLElement.focus()`, no vía
// propagación de eventos de teclado.
//
// Por eso el bloqueo de keydown/keyup/keypress por sí solo "funciona una vez"
// (mientras el foco siga, por casualidad, en el campo correcto) y luego deja
// de funcionar en cuanto Quill vuelve a robar el foco.
//
// SOLUCIÓN DEFINITIVA
// ───────────────────
// La única forma 100% confiable de impedir que `.ql-editor` reciba el foco es
// que el navegador NO PUEDA enfocarlo: para eso ponemos `contenteditable` en
// "false" (es justo lo que hace `quill.enable(false)` puertas adentro — ver
// `Scroll.prototype.enable`). Con `contenteditable="false"` y sin `tabindex`,
// `quill.root.focus()` se vuelve un no-op del navegador: el foco simplemente
// no se mueve, sin importar cuántas veces Quill insista.
//
// Para que esto funcione en TODOS los casos (clic con mouse, Tab, foco
// programático al abrir un overlay, etc.) lo activamos en dos puntos:
//   1) 'mousedown' en fase de captura — ANTES de que cualquier listener interno
//      de Quill pueda reaccionar (nuestros listeners se registran aquí, antes
//      de bootstrapApplication(), por lo que corren primero).
//   2) 'focusin' — red de seguridad para focos que no vienen de un clic
//      (navegación con Tab, `.focus()` programático al abrir un modal, etc.)
// Al salir del campo ('focusout'/'mouseup' fuera de él) reactivamos el editor,
// salvo que el nuevo foco también sea otro campo 'stop-quill-events' (para
// poder saltar de uno a otro sin que el editor parpadee entre medio).
// ════════════════════════════════════════════════════════════════════════════

/** Activa/desactiva contenteditable en TODOS los `.ql-editor` de la página. */
function setEditorsEditable(editable: boolean): void {
  document.querySelectorAll('.ql-editor').forEach((el) => {
    (el as HTMLElement).setAttribute('contenteditable', editable ? 'true' : 'false');
  });
}

/** Si quedó una selección nativa residual dentro de Quill, la limpiamos. */
function clearResidualQuillSelection(): void {
  const sel = window.getSelection();
  if (sel && sel.anchorNode) {
    const anchorEl = (sel.anchorNode as Node).parentElement;
    if (anchorEl?.closest('.ql-editor')) {
      sel.removeAllRanges();
    }
  }
}

document.addEventListener(
  'mousedown',
  (e) => {
    const target = e.target as HTMLElement;
    const stopEl = target.closest('.stop-quill-events');

    if (stopEl) {
      // OJO: aquí NO llamamos a setEditorsEditable(false). Si el editor tiene
      // el foco en este momento, poner contenteditable="false" lo vuelve no
      // enfocable y el navegador lo desenfoca de forma SÍNCRONA, en plena
      // fase de captura del mousedown — es decir, ANTES de que el navegador
      // ejecute su acción por defecto de mover el foco al elemento clicleado.
      // Ese "robo de foco a destiempo" confunde el algoritmo nativo de
      // foco-en-mousedown del navegador y el foco termina en <body> en lugar
      // de en nuestro input: el campo nunca recibe el foco y, por lo tanto,
      // jamás recibe las pulsaciones de teclado (el bug de "no me deja
      // escribir"). Por eso deshabilitar el editor se delega por completo al
      // listener de 'focusin' de abajo, que se dispara DESPUÉS de que el foco
      // ya aterrizó en el campo — sin interferir con la transferencia nativa.
      clearResidualQuillSelection();
      return;
    }

    const insideEditor = !!(target.closest('.ql-editor') || target.closest('.ql-toolbar'));
    if (insideEditor) {
      // El usuario hace clic de vuelta en el editor: nos aseguramos de
      // reactivarlo por si había quedado deshabilitado.
      setEditorsEditable(true);
    } else {
      clearResidualQuillSelection();
    }
  },
  true,
);

// NOTA: deliberadamente NO interceptamos keydown/keyup/keypress aquí.
// stopPropagation()/stopImmediatePropagation() en la fase de captura de
// 'document' evita que el evento llegue siquiera a la fase de "target",
// donde viven los listeners propios del elemento — incluyendo los bindings
// de Angular como (keydown.enter)="updateTitle()". Es decir, ese bloqueo
// rompería silenciosamente esos handlers en los campos protegidos. Y no
// aporta nada: el toggle de `contenteditable` de arriba ya es 100% suficiente
// para que Quill jamás reciba el foco ni, por lo tanto, las pulsaciones.

// Red de seguridad para focos que no provienen de un mousedown (navegación con
// Tab, `.focus()` programático al abrir un modal/overlay, etc.).
document.addEventListener(
  'focusin',
  (e) => {
    if ((e.target as HTMLElement).closest('.stop-quill-events')) {
      setEditorsEditable(false);
    }
  },
  true,
);

document.addEventListener(
  'focusout',
  (e) => {
    if ((e.target as HTMLElement).closest('.stop-quill-events')) {
      // 'relatedTarget' apunta al elemento que GANA el foco (o null si no gana
      // ninguno, p.ej. el campo fue removido del DOM al cerrar un modal/sticky
      // note). Lo resolvemos de forma síncrona —sin setTimeout— para que el
      // editor quede reactivado ANTES de que continúe cualquier código que
      // dependa de él (p.ej. quill.getSelection(true) tras insertar una
      // tabla/ecuación, que fuerza el foco de vuelta al editor).
      const related = (e as FocusEvent).relatedTarget as HTMLElement | null;
      if (!related?.closest?.('.stop-quill-events')) {
        setEditorsEditable(true);
      }
    }
  },
  true,
);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

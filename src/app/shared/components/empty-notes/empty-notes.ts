// empty-notes.ts
// Componente que se muestra cuando no hay ninguna nota seleccionada o el editor está vacío.
// Muestra un mensaje y un icono indicando al usuario que debe seleccionar o crear una nota.
import { Component } from '@angular/core';

@Component({
  selector: 'app-empty-notes', // Nombre del selector para usar en plantillas
  standalone: true, // Componente independiente (no requiere NgModule)
  imports: [], // No importa otros componentes o directivas
  templateUrl: './empty-notes.html', // Plantilla HTML asociada
  styleUrl: './empty-notes.scss', // Estilos específicos
})
export class EmptyNotes {} // Clase vacía, solo lógica de presentación

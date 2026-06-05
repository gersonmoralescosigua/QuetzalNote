// loader.ts
// Componente que muestra un spinner de carga (loader) mientras se realizan operaciones asíncronas,
// como la carga de notas o la comunicación con Firebase.
import { Component } from '@angular/core';

@Component({
  selector: 'app-loader', // Selector para usar el componente
  imports: [], // No requiere dependencias externas
  templateUrl: './loader.html', // Plantilla con el HTML del loader
  styleUrl: './loader.scss', // Estilos específicos (puede estar vacío)
})
export class Loader {} // Sin lógica adicional, solo presentación

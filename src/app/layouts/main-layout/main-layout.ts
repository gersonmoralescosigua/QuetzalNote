import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TopbarComponent } from '../../shared/components/topbar/topbar';
import { EditorToolbar } from '../../shared/components/editor-toolbar/editor-toolbar';
import { NoteEditorComponent } from '../../features/notes/components/note-editor/note-editor';
import { UiService } from '../../shared/services/ui.service'; // <-- Importar

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, EditorToolbar, NoteEditorComponent],
  templateUrl: './main-layout.html',
})
export class MainLayoutComponent {
  ui = inject(UiService); // <-- Inyectar el servicio
}

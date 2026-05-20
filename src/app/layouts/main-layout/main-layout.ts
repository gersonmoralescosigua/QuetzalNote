import { Component } from '@angular/core';
import { Topbar } from '../../shared/components/topbar/topbar';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { NoteEditorComponent } from '../../features/notes/components/note-editor/note-editor';

@Component({
  selector: 'app-main-layout',
  imports: [SidebarComponent, Topbar, NoteEditorComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}

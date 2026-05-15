import { Component } from '@angular/core';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Topbar } from '../../shared/components/topbar/topbar';
import { NoteEditor } from '../../features/notes/components/note-editor/note-editor';

@Component({
  selector: 'app-main-layout',
  imports: [Sidebar, Topbar, NoteEditor],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}

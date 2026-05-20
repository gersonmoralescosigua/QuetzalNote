import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockNotesService } from '../../../../shared/services/mock-notes';
import { Note } from '../../../../core/models/note.model';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.scss'],
})
export class NoteEditorComponent implements OnInit {
  selectedNote: Note | null = null;

  constructor(private mockNotesService: MockNotesService) {}

  ngOnInit(): void {
    this.mockNotesService.getSelectedNote().subscribe((note) => {
      this.selectedNote = note;
    });
  }

  // Método específico para el título
  onTitleChange(newTitle: string): void {
    if (this.selectedNote) {
      this.mockNotesService.updateNote(this.selectedNote.id!, {
        titulo: newTitle,
      });
    }
  }

  // Método específico para el contenido
  onContentChange(newContent: string): void {
    if (this.selectedNote) {
      this.mockNotesService.updateNote(this.selectedNote.id!, {
        contenido: newContent,
      });
    }
  }
}

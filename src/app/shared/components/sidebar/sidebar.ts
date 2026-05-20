import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockNotesService } from '../../services/mock-notes';
import { Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class SidebarComponent implements OnInit {
  notes: Note[] = [];

  constructor(private mockNotesService: MockNotesService) {}

  ngOnInit(): void {
    this.mockNotesService.getNotes().subscribe((notes) => {
      this.notes = notes;
    });
  }

  createNote(): void {
    this.mockNotesService.createNote();
  }

  selectNote(id: string): void {
    this.mockNotesService.selectNote(id);
  }
}

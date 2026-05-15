import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyNotes } from './empty-notes';

describe('EmptyNotes', () => {
  let component: EmptyNotes;
  let fixture: ComponentFixture<EmptyNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyNotes],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyNotes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

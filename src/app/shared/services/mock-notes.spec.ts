import { TestBed } from '@angular/core/testing';

import { MockNotes } from './mock-notes';

describe('MockNotes', () => {
  let service: MockNotes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockNotes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

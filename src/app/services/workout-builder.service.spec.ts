import { TestBed } from '@angular/core/testing';

import { WorkoutBuilderService } from './workout-builder.service';

describe('WorkoutBuilderService', () => {
  let service: WorkoutBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkoutBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

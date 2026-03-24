import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateListComponent } from './template-list.component';
import { DatabaseService } from '../../services/database.service';
import { Router } from '@angular/router';

describe('TemplateListComponent', () => {
  let fixture: ComponentFixture<TemplateListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateListComponent],
      providers: [
        { provide: DatabaseService, useValue: { getAllWorkoutTemplates: () => Promise.resolve([]) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TemplateListComponent);
    fixture.detectChanges();
  });

  it('should render the breadcrumb', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ls -la ./templates/routines/');
  });

  it('should show empty state when no templates', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('NO_ROUTINES_FOUND');
  });
});

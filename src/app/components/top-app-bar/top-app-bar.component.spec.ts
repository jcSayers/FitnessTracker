import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopAppBarComponent } from './top-app-bar.component';

describe('TopAppBarComponent', () => {
  let fixture: ComponentFixture<TopAppBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopAppBarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TopAppBarComponent);
    fixture.detectChanges();
  });

  it('should render brand text', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('root@fitness');
  });

  it('should render a clock', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(/\[\s*\d{2}:\d{2}:\d{2}\s*\]/);
  });
});

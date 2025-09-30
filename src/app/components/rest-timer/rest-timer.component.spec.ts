import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestTimerComponent } from './rest-timer.component';

describe('RestTimerComponent', () => {
  let component: RestTimerComponent;
  let fixture: ComponentFixture<RestTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestTimerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

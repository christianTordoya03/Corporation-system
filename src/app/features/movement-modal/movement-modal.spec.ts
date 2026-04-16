import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovementModal } from './movement-modal';

describe('MovementModal', () => {
  let component: MovementModal;
  let fixture: ComponentFixture<MovementModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovementModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

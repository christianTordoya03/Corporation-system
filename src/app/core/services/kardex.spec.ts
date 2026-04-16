import { TestBed } from '@angular/core/testing';

import { Kardex } from './kardex';

describe('Kardex', () => {
  let service: Kardex;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Kardex);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

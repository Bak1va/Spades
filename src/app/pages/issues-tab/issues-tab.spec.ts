import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuesTab } from './issues-tab';

describe('IssuesTab', () => {
  let component: IssuesTab;
  let fixture: ComponentFixture<IssuesTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IssuesTab]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssuesTab);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

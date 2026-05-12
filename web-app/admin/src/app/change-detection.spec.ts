import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'test-change-consumer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <ul>
        <li>{{ key1 }}</li>
        <li>
          <ul>
            <li *ngFor="let x of key2">{{ x }}</li>
          </ul>
        </li>
        <li>{{ key3 | json }}</li>
      </ul>
    </div>
  `
})
class ChangeConsumerComponent implements OnChanges {
  @Input() key1: string;
  @Input() key2: string[];
  @Input() key3: any;

  changes = new BehaviorSubject<SimpleChanges>({});

  ngOnChanges(changes: SimpleChanges) {
    this.changes.next(changes);
  }
}

@Component({
  standalone: true,
  imports: [ChangeConsumerComponent],
  template: `<test-change-consumer
    #target
    [key1]="state.key1"
    [key2]="state.key2"
    [key3]="state.key3"
  ></test-change-consumer>`
})
class TestHostComponent {
  state: {
    key1: string;
    key2: string[];
    key3: any;
  };

  constructor() {
    this.state = {
      key1: null,
      key2: [],
      key3: {}
    };
  }
}

describe('change detection', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let target: ChangeConsumerComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();
  }));

  let changes: SimpleChanges[];

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.autoDetectChanges(false);
    host = fixture.componentInstance;
    fixture.detectChanges();
    target = fixture.debugElement.query(
      By.directive(ChangeConsumerComponent)
    ).componentInstance;
    changes = [];
    target.changes.subscribe((x: SimpleChanges) => {
      changes.push(
        _.mapValues(x, (change: SimpleChange) => {
          return new SimpleChange(
            change.previousValue,
            change.currentValue,
            change.firstChange
          );
        })
      );
    });
  });

  it('should create', () => {
    expect(target).toBeTruthy();
  });

  it('detects changes', () => {
    changes = [];

    host.state = { ...host.state, key1: 'abc' };
    fixture.detectChanges();
    host.state = { ...host.state, key1: 'abc' };
    fixture.detectChanges();
    host.state = { ...host.state, key1: 'def' };
    fixture.detectChanges();

    expect(changes).toEqual([
      {
        key1: new SimpleChange(null, 'abc', false)
      },
      {
        key1: new SimpleChange('abc', 'def', false)
      }
    ]);
  });
});

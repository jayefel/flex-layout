import {Component} from '@angular/core';

const DIRECTIONS = ['row', 'row-reverse', 'column', 'column-reverse'];

@Component({
  selector: 'demo-flex-row-fill',
  templateUrl: './flex-row-fill.component.html',
  styleUrls: ['./flex-row-fill.component.scss']
})
export class FlexRowFillComponent {
  direction = 'row';
  someValue = 20;

  toggleDirection() {
    const next = (DIRECTIONS.indexOf(this.direction) + 1 ) % DIRECTIONS.length;
    this.direction = DIRECTIONS[next];
  }
}

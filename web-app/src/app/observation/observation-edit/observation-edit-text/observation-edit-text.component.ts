import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

interface TextField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-text',
  templateUrl: './observation-edit-text.component.html',
  styleUrls: ['./observation-edit-text.component.scss']
})
export class ObservationEditTextComponent implements OnInit {
  @Input() control: FormControl

  @Input() field: TextField;
  
  ngOnInit(): void {
    console.log('init text component w/ group ', this.control)
  }
}

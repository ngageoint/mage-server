import { Component, EventEmitter, Input, Output } from '@angular/core'

export enum DiscalimerCloseReason  {
  ACCEPT, REJECT
}

export interface DiscalimeCloseEvent {
  reason: DiscalimerCloseReason
}

@Component({
  selector: 'disclaimer',
  templateUrl: './disclaimer.component.html',
  styleUrls: ['./disclaimer.component.scss']
})
export class DisclaimerComponent {  
  @Input() title: string
  @Input() text: string

  @Output() close = new EventEmitter<DiscalimeCloseEvent>()

  onAccept(): void {
    this.close.emit({
      reason: DiscalimerCloseReason.ACCEPT
    })
  }

  onReject(): void {
    this.close.emit({
      reason: DiscalimerCloseReason.REJECT
    })
  }

}

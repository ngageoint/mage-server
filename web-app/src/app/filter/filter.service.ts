import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  private eventSource = new Subject<any>()

  event$ = this.eventSource.asObservable()

}

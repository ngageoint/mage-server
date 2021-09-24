import { Component } from '@angular/core';
import { FormControl } from '@angular/forms'
import { itemRangeOfPage, PageOf, PagingDataSource } from 'core-lib-src/paging'
import { User } from 'core-lib-src/user'
import { of } from 'rxjs'


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  userControl = new FormControl(null)
}

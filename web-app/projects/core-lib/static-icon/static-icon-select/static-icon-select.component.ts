import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import {
  PagingParameters,
  PagingDataSource
} from '@ngageoint/mage.web-core-lib/paging';
import { StaticIcon } from '../static-icon.model';
import { StaticIconService } from '../static-icon.service';

export interface StaticIconSelectItem {
  id: string;
  path: string;
  title: string;
  fileName: string;
}

@Component({
  selector: 'static-icon-select',
  standalone: true,
  imports: [CommonModule, ScrollingModule, MatCardModule],
  templateUrl: './static-icon-select.component.html',
  styleUrls: ['./static-icon-select.component.scss']
})
export class StaticIconSelectComponent implements OnInit {
  icons: StaticIcon[] | null = null;
  dataSource: PagingDataSource<StaticIcon>;

  constructor(private iconService: StaticIconService) {
    this.dataSource = new PagingDataSource<StaticIcon>(
      250,
      (paging: PagingParameters) => {
        return this.iconService.fetchIcons(paging);
      }
    );
  }

  ngOnInit() {
    this.iconService.fetchIcons().subscribe((x) => {
      this.icons = x.items;
    });
  }

  onBrowseForUploadIcon() {
    throw new Error('unimplemented');
  }
}

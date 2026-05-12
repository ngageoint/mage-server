import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange as MatSelectChange, MatSelectModule } from '@angular/material/select';
import { LocalStorageService } from 'src/app/http/local-storage.service';

interface CoordinateSystemOption {
  title: string
  coordinateSystem: 'wgs84' | 'mgrs' | 'dms'
}

@Component({
  selector: 'coordinate-system',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './coordinate-system.component.html',
  styleUrls: ['./coordinate-system.component.scss']
})
export class CoordinateSystemComponent implements OnInit {

  coordinateSystemOptions: CoordinateSystemOption[] = [{
    title: 'Lat/Lng',
    coordinateSystem: 'wgs84'
  },{
    title: 'MGRS',
    coordinateSystem: 'mgrs'
  },{
    title: 'DMS',
    coordinateSystem: 'dms'
  }]
  coordinateSystemOption: CoordinateSystemOption

  constructor(
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    const coordinateSystem = this.localStorageService.getCoordinateSystemView()
    this.coordinateSystemOption = this.coordinateSystemOptions.find((option: CoordinateSystemOption) => option.coordinateSystem === coordinateSystem)
  }

  updateCoordinateSystem(change: MatSelectChange) {
    this.localStorageService.setTimeFormat(change.value.coordinateSystem);
  }

  public compareOption = function (option: CoordinateSystemOption, value: CoordinateSystemOption): boolean {
    return option.coordinateSystem === value.coordinateSystem
  }
}
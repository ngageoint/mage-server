import { AfterViewInit, Component, Inject, ViewChild } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Strategy } from '../admin-settings.model';
import { AuthenticationConfigurationService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'authentication-delete',
  templateUrl: './authentication-delete.component.html',
  styleUrls: ['./authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent implements AfterViewInit {
  displayedColumns: string[] = ['name', 'email'];
  dataSource: MatTableDataSource<string>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy,
    @Inject(AuthenticationConfigurationService)
    private authenticationConfigurationService: any) {

    this.dataSource = new MatTableDataSource([]);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.authenticationConfigurationService.deleteConfiguration(this.strategy).then(() => {
      this.dialogRef.close('delete');
    }).catch((err: any) => {
      console.error(err);
      this.dialogRef.close('cancel');
    });
  }
}
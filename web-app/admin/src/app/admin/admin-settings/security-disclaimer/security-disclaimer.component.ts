import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges
  } from "@angular/core";
  import { take } from "rxjs/operators";
  import { Disclaimer } from "./security-disclaimer.model";
  import { SettingsService } from '../../../../../src/app/services/settings.service';
  
  @Component({
    selector: "security-disclaimer",
    templateUrl: "security-disclaimer.component.html",
    styleUrls: ["./security-disclaimer.component.scss"]
  })
  export class SecurityDisclaimerComponent implements OnInit, OnChanges {
    @Output() saveComplete = new EventEmitter<boolean>();
    @Output() onDirty = new EventEmitter<boolean>();
    @Input() beginSave: any;
  
    disclaimer: Disclaimer = {
      show: false,
      title: "",
      text: ""
    };
  
    isDirty = false;
  
    constructor(private settingsService: SettingsService) {}
  
    ngOnInit(): void {
      this.settingsService
        .get("disclaimer")
        .pipe(take(1))
        .subscribe({
          next: (res: any) => {
            const loaded = res?.settings ?? res ?? null;
            if (loaded) {
              this.disclaimer = {
                ...this.disclaimer,
                ...loaded
              };
            }
          },
          error: (err) => console.log(err)
        });
    }
  
    ngOnChanges(changes: SimpleChanges): void {
      if (changes.beginSave && !changes.beginSave.firstChange) {
        if (this.isDirty) this.save();
      }
    }
  
    setDirty(status: boolean): void {
      this.isDirty = status;
      this.onDirty.emit(this.isDirty);
    }
  
    private save(): void {
      this.settingsService
        .update("disclaimer", this.disclaimer)
        .pipe(take(1))
        .subscribe({
          next: () => this.saveComplete.emit(true),
          error: () => this.saveComplete.emit(false)
        });
  
      this.setDirty(false);
    }
  }
  
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import * as _ from 'underscore';

@Injectable({
  providedIn: 'root'
})
export class FeatureService {
  constructor(
    private httpClient: HttpClient
  ) {}

  getFeatureCollection(event, layer): Observable<any> {
    let url: string
    if (event) {
      url = `/api/events/${event.id}/layers/${layer.id}/features`;
    } else if (layer) {
      url = `/api/layers/${layer.id}/features`;
    }

    return this.httpClient.get<any>(url).pipe(
      map((featureCollection: any) => {
        _.each(featureCollection.features, function (feature) {
          const style = feature.properties.style;
          if (!style) return;

          feature.style = {};
          if (style.iconStyle && style.iconStyle.icon) {
            feature.style.iconUrl = style.iconStyle.icon.href;
          }

          if (style.lineStyle && style.lineStyle.color) {
            feature.style.color = style.lineStyle.color.rgb;
          }

          if (style.polyStyle && style.polyStyle.color) {
            feature.style.fillColor = style.polyStyle.color.rgb;
            feature.style.fillOpacity = style.polyStyle.color.opacity / 255;
          }
        });

        return featureCollection
      })
    )
  }
}
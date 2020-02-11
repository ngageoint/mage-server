import { SourceDescriptor } from "../models";
import OgcApiFeatures from "../ogcapi-features";


export interface SourceConnection extends OgcApiFeatures.ServiceAdapter {

}

export interface ManifoldAdapter {

  connectTo(source: SourceDescriptor): Promise<SourceConnection>
}

export interface ManifoldPlugin {

  createAdapter(): Promise<ManifoldAdapter>
}
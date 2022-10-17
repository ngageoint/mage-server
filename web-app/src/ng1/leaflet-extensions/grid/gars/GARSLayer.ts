import { GARS, Grids, GridType, ZoomGrids } from "@ngageoint/gars-js";
import { GridTile, Point } from "@ngageoint/grid-js";
import { LatLng, GridLayer, Coords, DoneCallback, DomUtil, GridLayerOptions } from "leaflet";
import { TileDraw } from "./TileDraw";

export class GARSLayer extends GridLayer {

    private readonly grids: Grids;

    constructor(options?: GridLayerOptions, gridTypes?: GridType[]) {
        super(options);
        this.grids = Grids.create(gridTypes)
    }

    /** @inheritdoc */
    protected createTile(coords: Coords, done: DoneCallback): HTMLElement {
        // create a <canvas> element for drawing
        const tile = DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;

        // setup tile width and height according to the options
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;

        // get a canvas context and draw something on it using coords.x, coords.y and coords.z
        const ctx = tile.getContext('2d');

        this.drawTile(tile, coords.x, coords.y, this._map.getZoom()).then(bitmap => {
            done(null, tile);
        }).catch(err => {
            done(err);
        });

        // return the tile so it can be rendered on screen
        return tile;
    }

    /**
     * Draw the tile
     *
     * @param x    x coordinate
     * @param y    y coordinate
     * @param zoom zoom level
     * @return bitmap
    */
    public drawTile(tile: HTMLCanvasElement, x: number, y: number, zoom: number): Promise<ImageBitmap | undefined> {
        let bitmap: Promise<ImageBitmap | undefined>;
        const zoomGrids = this.grids.getGrids(zoom);
        if (zoomGrids.hasGrids()) {
            bitmap = this.drawTileFromTile(tile, GridTile.tile(tile.width, tile.height, x, y, zoom), zoomGrids);
        }
        return bitmap;
    }

    /**
     * Draw the tile
     *
     * @param gridTile  tile
     * @param zoomGrids zoom grids
     * @return bitmap tile
    */
    private drawTileFromTile(tile: HTMLCanvasElement, gridTile: GridTile, zoomGrids: ZoomGrids): Promise<ImageBitmap> {

        const canvas = tile.getContext('2d');
        const imageData = canvas.createImageData(gridTile.getWidth(), gridTile.getHeight());

        for (const grid of zoomGrids.getGrids()) {
            const lines = grid.getLinesFromGridTile(gridTile);
            if (lines) {
                TileDraw.drawLines(lines, gridTile, grid, canvas);
            }

            const labels = grid.getLabelsFromGridTile(gridTile);
            if (labels) {
                TileDraw.drawLabels(labels, gridTile, grid, canvas);
            }

        }

        return createImageBitmap(imageData);
    }

    /**
     * Get the Global Area Reference System coordinate for the location in the
     * zoom level precision
     *
     * @param latLng location
     * @param zoom   zoom level precision
     * @return GARS coordinate
    */
    public getCoordinateWithZoom(latLng: LatLng, zoom: number): string {
        return this.getCoordinate(latLng, this.getPrecision(zoom));
    }

    /**
     * Get the Global Area Reference System coordinate for the location in the
     * grid type precision
     *
     * @param latLng location
     * @param type   grid type precision
     * @return GARS coordinate
    */
    public getCoordinate(latLng: LatLng, type?: GridType): string {
        return this.getGARS(latLng).coordinate(type);
    }

    /**
     * Get the Global Area Reference System for the location
     *
     * @param bounds location
     * @return GARS
     */
    public getGARS(bounds: LatLng): GARS {
        const boundsDegrees = Point.degrees(bounds.lng, bounds.lat);
        const gars = GARS.fromPoint(boundsDegrees);
        return gars;
    }

    /**
     * Get the grid precision for the zoom level
     *
     * @param zoom zoom level
     * @return grid type precision
     */
    public getPrecision(zoom: number): GridType {
        return this.grids.getPrecision(zoom);
    }
}
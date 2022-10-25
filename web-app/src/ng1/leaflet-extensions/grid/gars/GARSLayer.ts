import { GARS, Grids, GridType, ZoomGrids } from "@ngageoint/gars-js";
import { GridTile, Point } from "@ngageoint/grid-js";
import { LatLng, Coords, DoneCallback, DomUtil, GridLayerOptions, GridLayer } from "leaflet";
import { TileDraw } from "./TileDraw";

export class GARSLayer extends GridLayer {

    private readonly grids: Grids;

    constructor(options?: GridLayerOptions) {
        super(options);
        this.grids = Grids.create()
    }

    /** @inheritdoc */
    protected createTile(coords: Coords, done: DoneCallback): HTMLElement {
        const zoom = coords.z;

        // create a <canvas> element for drawing
        const tile = DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;

        // setup tile width and height according to the options
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;

        const context = tile.getContext('2d', { alpha: true });
        context.clearRect(0, 0, tile.width, tile.height);

        if (tile.getContext) {
            this.drawTile(context, tile, coords.x, coords.y, zoom).then(() => {
                done(null, tile);
            }).catch(err => {
                done(err);
            });
        }

        // return the tile so it can be rendered on screen
        return tile;
    }

    /**
     * Draw the tile
     *
     * @param tile  tile
     * @param x    x coordinate
     * @param y    y coordinate
     * @param zoom zoom level
     * @return bitmap
    */
    private drawTile(context: CanvasRenderingContext2D, tile: HTMLCanvasElement, x: number, y: number, zoom: number): Promise<void> {
        const zoomGrids = this.grids.getGrids(zoom);
        if (zoomGrids.hasGrids()) {
            this.drawTileFromTile(context, GridTile.tile(tile.width, tile.height, x, y, zoom), zoomGrids);
        }
        return Promise.resolve();
    }

    /**
     * Draw the tile
     *
     * @param gridTile  tile
     * @param zoomGrids zoom grids
     * @return bitmap tile
    */
    private drawTileFromTile(context: CanvasRenderingContext2D, gridTile: GridTile, zoomGrids: ZoomGrids): void {
        for (const grid of zoomGrids.getGrids()) {
            const lines = grid.getLinesFromGridTile(gridTile);
            if (lines) {
                TileDraw.drawLines(lines, gridTile, grid, context);
            }

            const labels = grid.getLabelsFromGridTile(gridTile);
            if (labels) {
                TileDraw.drawLabels(labels, gridTile, grid, context);
            }
        }
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
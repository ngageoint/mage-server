import { Grid, GridLabel, GridLine } from '@ngageoint/gars-js';
import { GridTile } from '@ngageoint/grid-js';

/**
 * Tile draw utilities for lines and labels
 *
 */
export class TileDraw {

    /**
     * Draw the lines on the tile
     *
     * @param lines  lines to draw
     * @param tile   tile
     * @param grid   grid
     * @param context draw canvas
     */
    public static drawLines(lines: GridLine[], tile: GridTile, grid: Grid, context: CanvasRenderingContext2D): void {

        for (const line of lines) {
            context.beginPath();
            this.addPolyline(tile, context, line);
            context.lineWidth = grid.getWidth(line.getGridType());
            context.strokeStyle = grid.getColor(line.getGridType()).getColorHex();
            context.stroke();
        }
    }

    /**
     * Add the polyline to the path
     *
     * @param tile tile
     * @param context line path
     * @param line line to draw
     */
    private static addPolyline(tile: GridTile, context: CanvasRenderingContext2D, line: GridLine): void {

        const metersLine = line.toMeters();
        const point1 = metersLine.getPoint1();
        const point2 = metersLine.getPoint2();

        const pixel = point1.getPixelFromTile(tile);
        context.moveTo(pixel.getX(), pixel.getY());

        const pixel2 = point2.getPixelFromTile(tile);
        context.lineTo(pixel2.getX(), pixel2.getY());
    }

    /**
     * Draw the labels on the tile
     *
     * @param labels labels to draw
     * @param tile   tile
     * @param grid grid
     * @param context draw canvas
     */
    public static drawLabels(labels: GridLabel[], tile: GridTile, grid: Grid, context: CanvasRenderingContext2D): void {
        for (const label of labels) {
            this.drawLabel(label, tile, grid, context);
        }
    }

    /**
     * Draw the label
     *
     * @param label  label to draw
     * @param tile   tile
     * @param grid grid
     * @param context draw canvas
     */
    public static drawLabel(label: GridLabel, tile: GridTile, grid: Grid, context: CanvasRenderingContext2D): void {

        const name = label.getName();
        const textHeight = 12;
        context.font = textHeight.toString() + 'px monospace';
        context.fillStyle = grid.getLabeler().getColor().getColorHex();
        context.textBaseline = 'middle';
        context.textAlign = 'center';

        const textMetrics = context.measureText(name);

        // Determine the text bounds
        const textWidth = textMetrics.width;

        // Determine the pixel width and height of the label grid zone to the tile
        const pixelRange = label.getBounds().getPixelRangeFromTile(tile);

        // Determine the maximum width and height a label in the grid should be
        const gridPercentage = 1.0 - (2 * grid.getLabelBuffer());
        const maxWidth = gridPercentage * pixelRange.getWidth();
        const maxHeight = gridPercentage * pixelRange.getHeight();

        // If it fits, draw the label in the center of the grid zone
        if (textWidth <= maxWidth && textHeight <= maxHeight) {
            const centerPixel = label.getCenter().getPixelFromTile(tile);
            context.fillText(name, centerPixel.getX(), centerPixel.getY());
        }
    }
}

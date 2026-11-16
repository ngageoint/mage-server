import { Injectable } from "@angular/core";
import * as DMS from '../geometry/geometry-dms'
import mgrs from 'mgrs'
import { GARS } from '@ngageoint/gars-js'
import { PlacenameSearchResult, PlacenameSearchService } from "src/app/geocoder/search/search.service"
import { MapSettingsService } from "../map/settings/map.settings.service";
import { MapSettings, MobileSearchType, WebSearchType } from "../entities/map/entities.map";
import { firstValueFrom } from "rxjs";
import { DimensionKey } from '../geometry/geometry-dms';
import { FormattedCoordinate } from '../entities/geometry/entities.geometry';
import type { Position } from 'geojson';

@Injectable({
	providedIn: 'root'
})
export class GeocoderService {

	mapSettings: MapSettings;

	constructor(
		private readonly placenameSearchService: PlacenameSearchService,
		private readonly mapSettingsService: MapSettingsService,
	) {
		this.mapSettings = {
			webSearchType: WebSearchType.NONE,
			webNominatimUrl: null,
			mobileSearchType: MobileSearchType.NONE,
			mobileNominatimUrl: null
		}
		this.mapSettingsService.getMapSettings().subscribe((settings: MapSettings) => {
			this.mapSettings = settings
		})
	}

	get placenameSearchEnabled(): boolean {
		return this.mapSettings.webSearchType !== WebSearchType.NONE
	}

	async geocode(input: string): Promise<PlacenameSearchResult[]> {
		const coordinate = this.coordinateFromText(input)
		if (coordinate) {
			const [longitude, latitude] = coordinate.position
			return [new PlacenameSearchResult(input, [longitude, latitude, longitude, latitude], coordinate.position)]
		}

		return await firstValueFrom(this.placenameSearchService.search(this.mapSettings, input))
	}

	// MGRS, GARS or latitude/longitude, without falling back to a placename search
	coordinateFromText(input: string): FormattedCoordinate | null {
		const whitespaceRemovedInput = input.replace(/\s+/g, "")

		try {
			return { position: mgrs.toPoint(whitespaceRemovedInput), coordinateSystem: 'mgrs' }
		} catch {
			// not mgrs
		}

		if (GARS.isGARS(whitespaceRemovedInput)) {
			const corner = GARS.parse(whitespaceRemovedInput).toPoint()
			const half = GARS.precision(whitespaceRemovedInput) / 2
			return { position: [corner.getLongitude() + half, corner.getLatitude() + half], coordinateSystem: 'gars' }
		}

		try {
			const position = this.parse(input)
			if (!position.some(Number.isNaN)) {
				return { position, coordinateSystem: this.isDecimal(input) ? 'wgs84' : 'dms' }
			}
		} catch {
			// not a parsable coordinate
		}

		return null
	}

	private isDecimal(input: string): boolean {
		return this.splitCoordinates(input).every(part => /^[NSEW]?[-+]?\d{1,3}(\.\d+)?[NSEW]?$/.test(part.trim()))
	}

	parse(coordinates?: string | null): Position {
		const split = this.splitCoordinates(coordinates);
		const parsed = this.parseGeometry(split[0], split[1])
		if (split.length !== 2 || !parsed.every(Number.isNaN)) {
			return parsed
		}

		return [
			this.parseSingle(split[1], false) ?? Number.NaN,
			this.parseSingle(split[0], true) ?? Number.NaN
		]
	}

	splitCoordinates(coordinates?: string | null): string[] {
		let split: string[] = [];

		if (coordinates == null) {
			return split;
		}

		// Trim whitespace from the start and end of the string
		let coordinatesToParse = coordinates.trim().toUpperCase();

		// Trim any instances of these words in the string
		coordinatesToParse = coordinatesToParse.replace(/LAT\./g, "");
		coordinatesToParse = coordinatesToParse.replace(/LAT:/g, "");
		coordinatesToParse = coordinatesToParse.replace(/LAT/g, "");
		coordinatesToParse = coordinatesToParse.replace(/LONG\./g, "");
		coordinatesToParse = coordinatesToParse.replace(/LONG:/g, "");
		coordinatesToParse = coordinatesToParse.replace(/LONG/g, "");
		coordinatesToParse = coordinatesToParse.replace(/LON\./g, "");
		coordinatesToParse = coordinatesToParse.replace(/LON:/g, "");
		coordinatesToParse = coordinatesToParse.replace(/LON/g, "");

		coordinatesToParse = coordinatesToParse.trim();

		// If there is a comma, split on that
		if (coordinatesToParse.includes(",")) {
			return coordinatesToParse
				.split(",")
				.map(splitString => splitString.replace(/\s+/g, ""));
		}

		// If there is a slash, split on that
		if (coordinatesToParse.includes("/")) {
			return coordinatesToParse
				.split("/")
				.map(splitString => splitString.replace(/\s+/g, ""));
		}

		// Check if there are any direction letters
		const directionRegex = /[NSEW]/;
		const hasDirection = directionRegex.test(coordinatesToParse);

		// If the string has a direction we can try to split on the dash,
		// but only if there is one or two dashes
		const dashCount = [...coordinatesToParse].filter(
			character => character === "-"
		).length;
		if (
			hasDirection &&
			coordinatesToParse.includes("-") &&
			dashCount <= 2
		) {
			return coordinatesToParse
				.split("-")
				.map(splitString => splitString.replace(/\s+/g, ""));
		} else if (hasDirection) {
			// If the string has a direction but no dash, split on the direction
			const firstDirectionIndex = coordinatesToParse.search(directionRegex);
			let lastDirectionIndex = -1;
			for (let index = coordinatesToParse.length - 1; index >= 0; index--) {
				if (directionRegex.test(coordinatesToParse[index])) {
					lastDirectionIndex = index;
					break;
				}
			}

			// The direction will either be at the beginning of the string,
			// or the end
			if (firstDirectionIndex === 0) {
				// If the direction is at the beginning of the string,
				// use the second index unless there is no second index
				// in which case there is only one coordinate
				if (
					lastDirectionIndex !== -1 &&
					lastDirectionIndex !== firstDirectionIndex
				) {
					split.push(
						coordinatesToParse.substring(0, lastDirectionIndex), 
						coordinatesToParse.substring(lastDirectionIndex)
					);
				} else {
					// Only one coordinate
					split.push(coordinatesToParse);
				}
			} else if (
				lastDirectionIndex === coordinatesToParse.length - 1
			) {
				// If the last direction index is the end of the string,
				// use the first index unless the first and last index are the same
				if (lastDirectionIndex === firstDirectionIndex) {
					// Only one coordinate
					split.push(coordinatesToParse);
				} else {
					split.push(
						coordinatesToParse.substring(
							0,
							firstDirectionIndex + 1
						), 
						coordinatesToParse.substring(firstDirectionIndex + 1)
					);
				}
			}
		}

		if (split.length != 0) {
			return split
		}

		// One last attempt to split. If there is one whitespace character,
		// split on that
		const whitespaceSplit = coordinatesToParse.split(/\s+/);

		if (whitespaceSplit.length === 2) {
			split = whitespaceSplit;
		}

		if (split.length === 0) {
			split = [coordinates];
		}

		return split.map(splitString => splitString.replace(/\s+/g, ""));
	}

	parseSingle(
		coordinate?: string | null,
		enforceLatitude: boolean = false
	): number | null {
		if (coordinate == null) {
			return null;
		}

		const normalized = coordinate.trim();
		// Check if it is a number and that number could be
		// a valid latitude or longitude.
		// Could either be a decimal or whole number representing
		// lat/lng, or a DDMMSS.sss number representing DMS.
		const decimalDegrees = Number(normalized);
		if (!Number.isNaN(decimalDegrees)) {
			// If either of these are true, parse it as a regular latitude/longitude
			if (
				(!enforceLatitude &&
					decimalDegrees >= -180 &&
					decimalDegrees <= 180) ||
				(enforceLatitude &&
					decimalDegrees >= -90 &&
					decimalDegrees <= 90)
			) {
				return decimalDegrees;
			}
		}

		// Try to parse it as DMS
		const parsed = DMS.parseOne(coordinate, enforceLatitude ? DimensionKey.Latitude : DimensionKey.Longitude)
		if (!Number.isNaN(parsed)) {
			return parsed
		}
		return null
	}

	parseGeometry(latitudeString: string, longitudeString: string): Position {
		return [this.parseLongitude(longitudeString), this.parseLatitude(latitudeString)]
	}

	parseLatitude(input: string): number {
		return this.parseCoordinate(input, 'lat');
	}

	parseLongitude(input: string): number {
		return this.parseCoordinate(input, 'lon');
	}

	parseCoordinate(input: string, type = 'lat'): number {
		if (!input || typeof input !== 'string') {
			return Number.NaN;
		}

		let str = input.trim();

		// Normalize unicode quote variants
		str = str
			.replace(/[’´`]/g, "'")
			.replace(/[″”“]/g, '"')
			.replace(/''/g, '"')
			.replace(',', '.')
			.replace(/\s+/g, ' ');

		// Detect hemisphere
		let sign = 1;

		if (/[SW]/i.test(str)) {
			sign = -1;
		}

		if (/[NE]/i.test(str)) {
			sign = 1;
		}

		// Remove hemisphere letters
		str = str.replace(/[NSEW]/gi, '').trim();

		// Case 1: decimal degrees already
		if (/^-?\d+(\.\d+)?$/.test(str)) {
			const value = Number.parseFloat(str);
			return this.validateCoordinate(value < 0 ? value : value * sign, type);
		}

		if (str.startsWith('-')) {
			sign = -1;
		}

		// Case 2: DMS format
		const match = str.match(
			/(\d+(?:\.\d+)?)\s*[°-]?\s*(?:(\d+(?:\.\d+)?)\s*['′-]?\s*)?(?:(\d+(?:\.\d+)?)\s*["]?)?/
		);
		if (!match) {
			return Number.NaN;
		}

		const deg = Number.parseFloat(match[1]) || 0;
		const min = Number.parseFloat(match[2]) || 0;
		const sec = Number.parseFloat(match[3]) || 0;

		const decimal = (deg + min / 60 + sec / 3600) * sign;
		return this.validateCoordinate(decimal, type);
	}

	validateCoordinate(value: number, type: string): number {
		if (type === 'lat') {
			if (value < -90 || value > 90) return Number.NaN;
		}

		if (type === 'lon') {
			if (value < -180 || value > 180) return Number.NaN;
		}
		return value;
	}
}
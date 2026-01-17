/**
 * SafeSnap - Location Pool
 * Provides random location names for PII replacement
 * Includes cities, regions, countries, and geographic features
 */

import { enDictionary } from '../dictionaries/en.js';

export class LocationPool {
  constructor() {
    // Load location data from centralized dictionary
    this.cities = enDictionary.locationCities;
    this.regions = enDictionary.locationRegions;
    this.countries = enDictionary.locationCountries;
    this.features = enDictionary.locationFeatures;
  }

  /**
   * Get a random city name
   * @returns {string} City name
   */
  getRandomCity() {
    return this.cities[Math.floor(Math.random() * this.cities.length)];
  }

  /**
   * Get a random region/multi-word location
   * @returns {string} Region name
   */
  getRandomRegion() {
    return this.regions[Math.floor(Math.random() * this.regions.length)];
  }

  /**
   * Get a random country name
   * @returns {string} Country name
   */
  getRandomCountry() {
    return this.countries[Math.floor(Math.random() * this.countries.length)];
  }

  /**
   * Get a random geographic feature (ocean, mountain, river, etc.)
   * @returns {string} Geographic feature name
   */
  getRandomFeature() {
    return this.features[Math.floor(Math.random() * this.features.length)];
  }

  /**
   * Get a random location of any type
   * @param {string} [type] - Preferred type: 'city', 'region', 'country', 'feature', or null for random
   * @returns {string} Location name
   */
  getRandomLocation(type = null) {
    // If type specified, return that type
    if (type === 'city') return this.getRandomCity();
    if (type === 'region') return this.getRandomRegion();
    if (type === 'country') return this.getRandomCountry();
    if (type === 'feature') return this.getRandomFeature();

    // Random type if not specified
    const types = ['city', 'region', 'country', 'feature'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    return this.getRandomLocation(randomType);
  }

  /**
   * Infer location type from original text to provide similar replacement
   * @param {string} original - Original location text
   * @returns {string} Inferred type: 'city', 'region', 'country', or 'feature'
   */
  inferLocationType(original) {
    const lower = original.toLowerCase();

    // Check for geographic feature keywords
    const featureKeywords = [
      'ocean',
      'sea',
      'river',
      'lake',
      'mountain',
      'mountains',
      'desert',
      'forest',
      'falls',
      'canyon',
      'peak',
      'reef',
      'bay',
      'gulf',
      'strait',
      'channel',
      'peninsula',
      'island',
      'islands',
      'coast',
      'range',
      'valley',
      'ridge',
      'basin',
      'plateau',
      'plain',
      'plains',
      'hills',
      'highlands',
    ];

    for (const keyword of featureKeywords) {
      if (lower.includes(keyword)) {
        return 'feature';
      }
    }

    // Check for region keywords (multi-word areas)
    const regionKeywords = [
      'area',
      'valley',
      'region',
      'district',
      'territory',
      'province',
      'county',
      'metro',
      'metropolitan',
      'suburbs',
      'downtown',
    ];

    for (const keyword of regionKeywords) {
      if (lower.includes(keyword)) {
        return 'region';
      }
    }

    // Check if it's a known country (from gazetteer)
    const countryList = enDictionary.worldLocations.filter(
      (loc) =>
        loc.includes('United') ||
        loc.includes('Republic') ||
        loc === 'China' ||
        loc === 'Japan' ||
        loc === 'France' ||
        loc === 'Germany' ||
        loc === 'Italy' ||
        loc === 'Spain' ||
        loc === 'Canada' ||
        loc === 'Mexico' ||
        loc === 'Brazil' ||
        loc === 'Argentina' ||
        loc === 'India' ||
        loc === 'Russia' ||
        loc === 'Australia'
    );

    if (countryList.some((country) => original.toLowerCase() === country.toLowerCase())) {
      return 'country';
    }

    // Check word count - multi-word is likely region, single-word is city
    const wordCount = original.trim().split(/\s+/).length;
    if (wordCount >= 2) {
      return 'region';
    }

    // Default to city for single words
    return 'city';
  }

  /**
   * Get a similar-type replacement for a location
   * Tries to match the type (city->city, ocean->feature, etc.)
   * @param {string} original - Original location text
   * @returns {string} Similar replacement
   */
  getSimilarReplacement(original) {
    const type = this.inferLocationType(original);
    return this.getRandomLocation(type);
  }

  /**
   * Get multiple random locations (for batch replacement)
   * @param {number} count - Number of locations to generate
   * @param {string} [type] - Location type or null for mixed
   * @returns {string[]} Array of location names
   */
  getRandomLocations(count, type = null) {
    const locations = new Set();
    const allLocations = [...this.cities, ...this.regions, ...this.countries, ...this.features];

    while (locations.size < count && locations.size < allLocations.length) {
      locations.add(this.getRandomLocation(type));
    }
    return Array.from(locations);
  }

  /**
   * Get statistics about the location pool
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      cities: this.cities.length,
      regions: this.regions.length,
      countries: this.countries.length,
      features: this.features.length,
      total:
        this.cities.length + this.regions.length + this.countries.length + this.features.length,
    };
  }
}

export default LocationPool;

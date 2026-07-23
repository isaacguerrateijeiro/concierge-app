import "server-only";
import { autocompleteGoogle, googlePlacesConfigured, placeDetailsGoogle } from "./google";
import { autocompleteNominatim } from "./nominatim";
import type { AddressSuggestion, AutocompleteResult } from "./types";

export type { AddressSuggestion, AutocompleteResult } from "./types";
export { MADRID_FOCUS } from "./types";
export { placeDetailsGoogle, googlePlacesConfigured };

/**
 * Google Places (New) si hay API key; si no, Nominatim (OSM).
 * Google es el nivel “top” para POIs (aeropuerto T4, hoteles, etc.).
 */
export async function autocompleteAddress(opts: {
  text: string;
  size?: number;
  focusLat?: number;
  focusLon?: number;
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<AutocompleteResult> {
  const text = opts.text.trim();
  if (text.length < 3) return { suggestions: [], provider: googlePlacesConfigured() ? "google" : "nominatim" };

  if (googlePlacesConfigured()) {
    try {
      const suggestions = await autocompleteGoogle(opts);
      return { suggestions, provider: "google" };
    } catch (err) {
      console.error("[geocode] Google falló, fallback Nominatim:", err);
      const suggestions = await autocompleteNominatim(opts);
      return { suggestions, provider: "nominatim" };
    }
  }

  const suggestions = await autocompleteNominatim(opts);
  return { suggestions, provider: "nominatim" };
}

export async function resolveSuggestionCoords(
  suggestion: Pick<AddressSuggestion, "lat" | "lon" | "placeId" | "label" | "provider">
): Promise<{ label: string; lat: number; lon: number } | null> {
  if (
    suggestion.lat != null &&
    suggestion.lon != null &&
    Number.isFinite(suggestion.lat) &&
    Number.isFinite(suggestion.lon)
  ) {
    return { label: suggestion.label, lat: suggestion.lat, lon: suggestion.lon };
  }
  if (suggestion.placeId && suggestion.provider === "google") {
    return placeDetailsGoogle({ placeId: suggestion.placeId });
  }
  return null;
}

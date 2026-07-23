export interface AddressSuggestion {
  id: string;
  label: string;
  /** Presente si ya tenemos coords (Nominatim o Place Details). */
  lat: number | null;
  lon: number | null;
  /** Place ID de Google Places (New), para resolver coords al seleccionar. */
  placeId: string | null;
  provider: "google" | "nominatim";
  locality: string | null;
}

export interface AutocompleteResult {
  suggestions: AddressSuggestion[];
  provider: "google" | "nominatim";
}

export const MADRID_FOCUS = { lat: 40.416775, lon: -3.70379 };

// Países frecuentes para huéspedes internacionales en kiosko (Madrid).
// Orden: turistas habituales primero; el resto alfabético por nombre EN.

export interface PhoneCountry {
  iso: string;
  dial: string; // sin "+", p.ej. "44"
  nameEs: string;
  nameEn: string;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "GB", dial: "44", nameEs: "Reino Unido", nameEn: "United Kingdom", flag: "🇬🇧" },
  { iso: "US", dial: "1", nameEs: "Estados Unidos", nameEn: "United States", flag: "🇺🇸" },
  { iso: "DE", dial: "49", nameEs: "Alemania", nameEn: "Germany", flag: "🇩🇪" },
  { iso: "FR", dial: "33", nameEs: "Francia", nameEn: "France", flag: "🇫🇷" },
  { iso: "IT", dial: "39", nameEs: "Italia", nameEn: "Italy", flag: "🇮🇹" },
  { iso: "NL", dial: "31", nameEs: "Países Bajos", nameEn: "Netherlands", flag: "🇳🇱" },
  { iso: "PT", dial: "351", nameEs: "Portugal", nameEn: "Portugal", flag: "🇵🇹" },
  { iso: "BE", dial: "32", nameEs: "Bélgica", nameEn: "Belgium", flag: "🇧🇪" },
  { iso: "CH", dial: "41", nameEs: "Suiza", nameEn: "Switzerland", flag: "🇨🇭" },
  { iso: "IE", dial: "353", nameEs: "Irlanda", nameEn: "Ireland", flag: "🇮🇪" },
  { iso: "SE", dial: "46", nameEs: "Suecia", nameEn: "Sweden", flag: "🇸🇪" },
  { iso: "NO", dial: "47", nameEs: "Noruega", nameEn: "Norway", flag: "🇳🇴" },
  { iso: "DK", dial: "45", nameEs: "Dinamarca", nameEn: "Denmark", flag: "🇩🇰" },
  { iso: "FI", dial: "358", nameEs: "Finlandia", nameEn: "Finland", flag: "🇫🇮" },
  { iso: "AT", dial: "43", nameEs: "Austria", nameEn: "Austria", flag: "🇦🇹" },
  { iso: "PL", dial: "48", nameEs: "Polonia", nameEn: "Poland", flag: "🇵🇱" },
  { iso: "CZ", dial: "420", nameEs: "Chequia", nameEn: "Czechia", flag: "🇨🇿" },
  { iso: "RO", dial: "40", nameEs: "Rumanía", nameEn: "Romania", flag: "🇷🇴" },
  { iso: "HU", dial: "36", nameEs: "Hungría", nameEn: "Hungary", flag: "🇭🇺" },
  { iso: "GR", dial: "30", nameEs: "Grecia", nameEn: "Greece", flag: "🇬🇷" },
  { iso: "ES", dial: "34", nameEs: "España", nameEn: "Spain", flag: "🇪🇸" },
  { iso: "CA", dial: "1", nameEs: "Canadá", nameEn: "Canada", flag: "🇨🇦" },
  { iso: "MX", dial: "52", nameEs: "México", nameEn: "Mexico", flag: "🇲🇽" },
  { iso: "BR", dial: "55", nameEs: "Brasil", nameEn: "Brazil", flag: "🇧🇷" },
  { iso: "AR", dial: "54", nameEs: "Argentina", nameEn: "Argentina", flag: "🇦🇷" },
  { iso: "CL", dial: "56", nameEs: "Chile", nameEn: "Chile", flag: "🇨🇱" },
  { iso: "CO", dial: "57", nameEs: "Colombia", nameEn: "Colombia", flag: "🇨🇴" },
  { iso: "PE", dial: "51", nameEs: "Perú", nameEn: "Peru", flag: "🇵🇪" },
  { iso: "DO", dial: "1809", nameEs: "Rep. Dominicana", nameEn: "Dominican Republic", flag: "🇩🇴" },
  { iso: "AU", dial: "61", nameEs: "Australia", nameEn: "Australia", flag: "🇦🇺" },
  { iso: "NZ", dial: "64", nameEs: "Nueva Zelanda", nameEn: "New Zealand", flag: "🇳🇿" },
  { iso: "JP", dial: "81", nameEs: "Japón", nameEn: "Japan", flag: "🇯🇵" },
  { iso: "KR", dial: "82", nameEs: "Corea del Sur", nameEn: "South Korea", flag: "🇰🇷" },
  { iso: "CN", dial: "86", nameEs: "China", nameEn: "China", flag: "🇨🇳" },
  { iso: "IN", dial: "91", nameEs: "India", nameEn: "India", flag: "🇮🇳" },
  { iso: "AE", dial: "971", nameEs: "Emiratos Árabes", nameEn: "United Arab Emirates", flag: "🇦🇪" },
  { iso: "SA", dial: "966", nameEs: "Arabia Saudí", nameEn: "Saudi Arabia", flag: "🇸🇦" },
  { iso: "IL", dial: "972", nameEs: "Israel", nameEn: "Israel", flag: "🇮🇱" },
  { iso: "TR", dial: "90", nameEs: "Turquía", nameEn: "Turkey", flag: "🇹🇷" },
  { iso: "ZA", dial: "27", nameEs: "Sudáfrica", nameEn: "South Africa", flag: "🇿🇦" },
  { iso: "MA", dial: "212", nameEs: "Marruecos", nameEn: "Morocco", flag: "🇲🇦" },
  { iso: "RU", dial: "7", nameEs: "Rusia", nameEn: "Russia", flag: "🇷🇺" },
  { iso: "UA", dial: "380", nameEs: "Ucrania", nameEn: "Ukraine", flag: "🇺🇦" },
  { iso: "SG", dial: "65", nameEs: "Singapur", nameEn: "Singapore", flag: "🇸🇬" },
  { iso: "HK", dial: "852", nameEs: "Hong Kong", nameEn: "Hong Kong", flag: "🇭🇰" },
  { iso: "TW", dial: "886", nameEs: "Taiwán", nameEn: "Taiwan", flag: "🇹🇼" },
  { iso: "PH", dial: "63", nameEs: "Filipinas", nameEn: "Philippines", flag: "🇵🇭" },
  { iso: "TH", dial: "66", nameEs: "Tailandia", nameEn: "Thailand", flag: "🇹🇭" },
  { iso: "MY", dial: "60", nameEs: "Malasia", nameEn: "Malaysia", flag: "🇲🇾" },
  { iso: "ID", dial: "62", nameEs: "Indonesia", nameEn: "Indonesia", flag: "🇮🇩" },
];

/** País por defecto para huéspedes (turismo internacional). */
export const DEFAULT_PHONE_COUNTRY_ISO = "GB";

export function findPhoneCountry(iso: string): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.iso === iso) ??
    PHONE_COUNTRIES.find((c) => c.iso === DEFAULT_PHONE_COUNTRY_ISO)!
  );
}

/** Digitos nacionales (sin prefijo) + dial → E.164 con +. */
export function toE164(dial: string, national: string): string {
  const n = national.replace(/\D/g, "").replace(/^0+/, "");
  const d = dial.replace(/\D/g, "");
  if (!n) return "";
  return `+${d}${n}`;
}

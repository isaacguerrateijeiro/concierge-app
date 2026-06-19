interface BrandLogoProps {
  id: string;
  w?: number;
  h?: number;
}

export default function BrandLogo({ id, w = 200, h = 80 }: BrandLogoProps) {
  switch (id) {
    case "bolt":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <path d="M88 18 L70 44 L92 44 L82 62 L116 36 L94 36 L106 18 Z" fill="#0E1419" />
          <text x="124" y="50" fontFamily="Inter, system-ui" fontWeight="800" fontSize="28" fill="#0E1419" letterSpacing="-0.02em">Bolt</text>
        </svg>
      );
    case "bigbus":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <text x="100" y="34" textAnchor="middle" fontFamily="Inter, system-ui" fontWeight="900" fontSize="24" fill="#0E1419" letterSpacing="-0.04em">BIG BUS</text>
          <line x1="40" y1="44" x2="160" y2="44" stroke="#0E1419" strokeWidth="1.5" />
          <text x="100" y="62" textAnchor="middle" fontFamily="Inter, system-ui" fontWeight="600" fontSize="12" fill="#0E1419" letterSpacing="0.38em">MADRID</text>
        </svg>
      );
    case "changegroup":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <circle cx="36" cy="40" r="22" fill="rgba(255,255,255,0.22)" />
          <text x="36" y="50" textAnchor="middle" fontFamily="Georgia, serif" fontSize="28" fill="#fff" fontWeight="700">€</text>
          <text x="70" y="35" fontFamily="Inter, system-ui" fontWeight="800" fontSize="20" fill="#fff" letterSpacing="-0.02em">Change</text>
          <text x="70" y="59" fontFamily="Inter, system-ui" fontWeight="800" fontSize="20" fill="#fff" letterSpacing="-0.02em">Group</text>
        </svg>
      );
    case "prestapuffin":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <ellipse cx="36" cy="50" rx="18" ry="22" fill="#0A2040" />
          <ellipse cx="36" cy="54" rx="11" ry="14" fill="#fff" />
          <circle cx="36" cy="33" r="14" fill="#0A2040" />
          <ellipse cx="36" cy="36" rx="8" ry="9" fill="#fff" />
          <circle cx="36" cy="33" r="2" fill="#0A2040" />
          <path d="M28 41 L44 41 L36 52 Z" fill="#FF8A3D" stroke="#0A2040" strokeWidth="0.8" />
          <text x="66" y="44" fontFamily="Georgia, serif" fontSize="20" fill="#fff" letterSpacing="-0.01em">prestapuffin</text>
          <text x="66" y="62" fontFamily="Inter, system-ui" fontSize="9" fill="rgba(255,255,255,0.65)" letterSpacing="0.24em">MICROCRÉDITO</text>
        </svg>
      );
    case "prosegur":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <path d="M26 20 L50 20 Q62 20 62 32 L62 40 Q62 52 50 52 L38 52 L38 62 L26 62 Z" fill="#fff" />
          <rect x="38" y="28" width="16" height="14" rx="3" fill="#0033A0" />
          <text x="72" y="37" fontFamily="Inter, system-ui" fontWeight="900" fontSize="17" fill="#fff" letterSpacing="0.1em">PROSEGUR</text>
          <text x="72" y="56" fontFamily="Georgia, serif" fontSize="16" fill="#FFD400" fontStyle="italic">Digital Gold</text>
        </svg>
      );
    case "race":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <rect x="18" y="20" width="38" height="40" rx="7" fill="#0E1419" />
          <text x="37" y="49" textAnchor="middle" fontFamily="Inter, system-ui" fontWeight="900" fontSize="22" fill="#FFCD00" letterSpacing="-0.04em">R</text>
          <text x="68" y="45" fontFamily="Inter, system-ui" fontWeight="900" fontSize="30" fill="#0E1419" letterSpacing="0.06em">RACE</text>
          <text x="68" y="61" fontFamily="Inter, system-ui" fontWeight="600" fontSize="9" fill="#0E1419" letterSpacing="0.18em">SEGUROS DE VIAJE</text>
        </svg>
      );
    case "julia":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <text x="100" y="44" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="34" fill="#fff" letterSpacing="-0.02em">Julia</text>
          <text x="100" y="62" textAnchor="middle" fontFamily="Inter, system-ui" fontSize="9" fill="rgba(255,255,255,0.55)" letterSpacing="0.3em">TRAVEL</text>
        </svg>
      );
    case "madridapie":
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <circle cx="36" cy="40" r="24" fill="rgba(255,255,255,0.2)" />
          <text x="36" y="50" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="28" fill="#fff">M</text>
          <text x="74" y="35" fontFamily="Georgia, serif" fontStyle="italic" fontSize="18" fill="#fff" letterSpacing="-0.01em">Madrid</text>
          <text x="74" y="56" fontFamily="Inter, system-ui" fontWeight="700" fontSize="10" fill="rgba(255,255,255,0.75)" letterSpacing="0.2em">A PIE</text>
        </svg>
      );
    default:
      return (
        <svg width={w} height={h} viewBox="0 0 200 80">
          <text x="100" y="46" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#fff">{id}</text>
        </svg>
      );
  }
}

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

/**
 * Logo placeholder for Alfa Construtora.
 * Reserve este espaço — basta substituir o SVG por uma imagem importada.
 */
export function Logo({ size = 36, showWordmark = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm"
        style={{ width: size, height: size }}
        aria-label="Logo Alfa Construtora"
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
          <path
            d="M4 20 L12 4 L20 20 M7.5 14 H16.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="leading-tight">
          <div className="font-display text-base font-bold tracking-tight">
            Alfa <span className="text-accent">Construtora</span>
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Engenharia · Projetos · IA
          </div>
        </div>
      )}
    </div>
  );
}

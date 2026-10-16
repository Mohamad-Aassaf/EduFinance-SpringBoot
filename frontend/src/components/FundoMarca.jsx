/**
 * FundoMarca.jsx — Fundo escuro da marca, usado no Login e nas Boas-Vindas
 *
 * Cor escura da paleta, brilhos com as cores primária e de destaque, uma grade sutil
 * e um gráfico subindo no rodapé. Fica atrás do conteúdo (absolute + pointer-events-none);
 * o elemento pai precisa ter position relative/fixed e a cor de fundo var(--color-primary-dark).
 */
export default function FundoMarca({ idGradiente = "fundo-marca-area" }) {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent 45%), radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--color-primary) 45%, transparent), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <svg
        className="absolute bottom-0 left-0 w-full h-48 pointer-events-none opacity-25"
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={idGradiente} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 170 L60 150 L120 158 L180 120 L240 128 L300 95 L360 102 L420 60 L480 70 L540 30 L600 18 L600 200 L0 200 Z"
          fill={`url(#${idGradiente})`}
        />
        <path
          d="M0 170 L60 150 L120 158 L180 120 L240 128 L300 95 L360 102 L420 60 L480 70 L540 30 L600 18"
          fill="none"
          stroke="white"
          strokeWidth="3"
        />
      </svg>
    </>
  );
}

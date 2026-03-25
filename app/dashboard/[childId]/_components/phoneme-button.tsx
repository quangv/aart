type Props = {
  ipa: string;
  label: string;
  score?: number | null;
  mastered?: boolean;
  onClick?: () => void;
};

export default function PhonemeButton({
  ipa,
  label,
  score = null,
  mastered = false,
  onClick,
}: Props) {
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const normalizedScore = hasScore ? Math.max(0, Math.min(10, score)) : 0;
  const progressPercent = (normalizedScore / 10) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 font-semibold transition hover:scale-105 ${
        mastered
          ? "border-[#b8d696] bg-[#f0f9e5] text-[#5a7f44]"
          : "border-[#efc8ab] bg-[#fff5eb] text-[#2f2a26] hover:border-[#2d78c4]"
      }`}
      aria-label={
        hasScore
          ? `${label}, score ${normalizedScore.toFixed(1)} out of 10`
          : label
      }
    >
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-500 ${
          mastered
            ? "bg-linear-to-t from-[#b8d696] to-[#d8ebbe]"
            : "bg-linear-to-t from-[#9dcaef] to-[#d6eafd]"
        }`}
        style={{ height: `${progressPercent}%` }}
        aria-hidden="true"
      />

      {hasScore ? (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[#2f2a26]">
          {normalizedScore.toFixed(1)}
        </span>
      ) : null}

      <span className="relative z-10 text-xl">{ipa}</span>
      <span className="relative z-10 mt-1 px-1 text-center text-[10px] leading-tight text-[#7b6652]">
        {label}
      </span>
    </button>
  );
}

type Props = {
  ipa: string;
  label: string;
  mastered?: boolean;
  onClick?: () => void;
};

export default function PhonemeButton({
  ipa,
  label,
  mastered = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 font-semibold transition hover:scale-105 ${
        mastered
          ? "border-[#b8d696] bg-[#f0f9e5] text-[#5a7f44]"
          : "border-[#efc8ab] bg-[#fff5eb] text-[#2f2a26] hover:border-[#2d78c4]"
      }`}
    >
      <span className="text-xl">{ipa}</span>
      <span className="mt-1 px-1 text-center text-[10px] leading-tight text-[#7b6652]">
        {label}
      </span>
    </button>
  );
}

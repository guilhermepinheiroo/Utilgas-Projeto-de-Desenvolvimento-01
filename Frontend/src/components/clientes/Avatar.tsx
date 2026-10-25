interface AvatarProps {
  nome: string;
}

export function Avatar({ nome }: AvatarProps) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-800"
    >
      {iniciais}
    </span>
  );
}

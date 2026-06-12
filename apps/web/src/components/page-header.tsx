export function PageHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        {titulo}
      </h1>
      {descricao ? (
        <p className="mt-1 text-sm text-stone-500">{descricao}</p>
      ) : null}
    </div>
  );
}

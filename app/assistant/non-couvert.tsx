export function NonCouvert({ besoins }: { besoins: string[] }) {
  return (
    <div className="mt-6">
      <p className="font-medium">Ce que le catalogue ne couvre pas :</p>
      <ul className="mt-1 list-disc pl-5">
        {besoins.map((besoin) => (
          <li key={besoin}>{besoin}</li>
        ))}
      </ul>
    </div>
  );
}

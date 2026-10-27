export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
      <div className="h-[560px] animate-pulse rounded-[24px] bg-ink/10" />
      <div className="mt-10 h-10 w-2/3 animate-pulse rounded bg-ink/10" />
      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-[18px] bg-ink/10" />)}
      </div>
    </main>
  );
}
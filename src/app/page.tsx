import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 font-jakarta text-white">
      <Link href="/tv/" className="underline">
        Buka paparan TV →
      </Link>
    </main>
  );
}

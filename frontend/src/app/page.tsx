import type { Metadata } from "next";
import Link from "next/link";
import { Cloud9Logo } from "@/components/Cloud9Logo";

export const metadata: Metadata = {
  title: "C9 Oracle | Anti-strat scouting for VALORANT",
  description: "Know what an opponent will do next. Utility, Operator, defensive setups, attack executes, timeout advice and printable counter-cards from official GRID data.",
};

const TOOLS = [
  {
    href: "/scout",
    name: "Utility and Operator",
    question: "Where does a team put its utility, and who holds the Operator?",
    detail: "Heatmaps with numbered hotspots, and an Operator profile by player, side and buy.",
    cta: "Open Scout",
  },
  {
    href: "/scout",
    name: "Defensive setups",
    question: "How do they spread their defenders across the sites?",
    detail: "Counts of defenders per site about 15 seconds in, and how those rounds went.",
    cta: "Open Scout",
  },
  {
    href: "/scout",
    name: "Attack executes",
    question: "Where do they plant, how fast, and with what?",
    detail: "Plant sites, pace, attacker spread and the utility used before the plant.",
    cta: "Open Scout",
  },
  {
    href: "/scout/timeout",
    name: "Timeout advisor",
    question: "What should we change before the next rounds?",
    detail: "Their habits in the current score situation, compared with their normal game. Three adjustments, each with its rounds.",
    cta: "Open the advisor",
    featured: true,
  },
  {
    href: "/scout/card?team=Cloud9&map=lotus",
    name: "Counter-card",
    question: "What is the one-page plan for this map?",
    detail: "How to attack them, how to defend against them and what to do about their Operator. Print it or save it as a PDF.",
    cta: "See an example",
  },
];

const PRINCIPLES = [
  { title: "Evidence on every number", body: "Each result shows the rounds and matches behind it, so a coach can judge how far to trust it." },
  { title: "Confidence you can see", body: "High, medium or low badges, and thin samples are called leads, not rules." },
  { title: "Limits stated", body: "Sites are numbered, not lettered. Win rates are descriptive, not causal. The pages say so." },
];

export default function Home() {
  return (
    <main className="c9-bg-ethereal min-h-screen text-slate-800">
      <header className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 px-5 py-4">
        <Cloud9Logo size={44} />
        <span className="text-lg font-black tracking-tight text-sky-900">C9 Oracle</span>
        <nav className="ml-auto flex flex-wrap items-center gap-4 text-sm font-semibold text-sky-800">
          <Link href="/scout" className="hover:underline">Scout</Link>
          <Link href="/scout/timeout" className="hover:underline">Timeout advisor</Link>
          <Link href="/coach" className="hover:underline">Post-match coach</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-[1100px] px-5 pb-10 pt-10 sm:pt-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">VALORANT · Cloud9 x JetBrains Sky&apos;s the Limit 2026</p>
        <h1 className="mt-3 max-w-[16ch] text-4xl font-black leading-[1.05] text-sky-950 sm:text-6xl">Know what they will do next.</h1>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-slate-700 sm:text-lg">
          C9 Oracle turns an opponent&apos;s past rounds into a counter-plan a coach can use before a match and at a timeout. Every line comes from official GRID match data and
          shows the rounds behind it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/scout/timeout" className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700">
            Try the timeout advisor
          </Link>
          <Link href="/scout" className="rounded-xl border border-sky-300 bg-white px-5 py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50">
            Scout a team
          </Link>
        </div>
        <dl className="mt-10 grid max-w-[560px] grid-cols-3 gap-4 border-t border-sky-200 pt-5">
          {[
            ["857", "series analysed"],
            ["1.4M", "ability casts"],
            ["13", "maps with sites"],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="text-2xl font-black tabular-nums text-sky-900 sm:text-3xl">{n}</dt>
              <dd className="text-xs text-slate-600">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 pb-10" aria-labelledby="tools">
        <h2 id="tools" className="text-sm font-black uppercase tracking-wide text-sky-900">What it answers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.name}
              href={t.href}
              className={`group flex flex-col rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                t.featured ? "border-sky-500 bg-sky-50 lg:col-span-1" : "border-sky-200 bg-white/90"
              }`}
            >
              <span className="text-xs font-black uppercase tracking-wide text-sky-700">{t.name}</span>
              <span className="mt-1 text-base font-bold leading-snug text-slate-900">{t.question}</span>
              <span className="mt-2 flex-1 text-sm leading-snug text-slate-600">{t.detail}</span>
              <span className="mt-3 text-sm font-bold text-sky-700 group-hover:underline">{t.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 pb-14" aria-labelledby="honest">
        <h2 id="honest" className="text-sm font-black uppercase tracking-wide text-sky-900">How it stays honest</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-sky-200 bg-white/90 p-4">
              <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm leading-snug text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Counts and rates over rounds, not a black box. The optional Gemini wording on the timeout advisor only rephrases the advisor&apos;s own lines.
        </p>
      </section>
    </main>
  );
}

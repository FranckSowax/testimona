import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Honorez la mémoire de ceux qui comptent
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Testimona vous aide à créer une page mémorielle pérenne : témoignages, biographie,
              photos et donations en hommage, dans un espace recueilli partagé avec vos proches.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                Créer un mémorial
              </Link>
              <Link
                href="/search"
                className="rounded-md border-2 border-foreground/80 px-5 py-3 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
              >
                Rechercher un mémorial
              </Link>
            </div>
          </div>
          <div className="hidden md:flex md:justify-center">
            <Image
              src="/images/dove.svg"
              alt=""
              width={360}
              height={360}
              priority
              className="h-72 w-auto opacity-90"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Un espace dédié à la mémoire
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">Témoignages</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Recueillez les souvenirs des proches, en français ou en anglais.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">Biographie</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Racontez l'histoire de la personne, chapitre par chapitre.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-foreground">Donations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Permettez aux visiteurs de faire un don en hommage via Stripe.
            </p>
          </li>
        </ul>
      </section>
    </>
  );
}

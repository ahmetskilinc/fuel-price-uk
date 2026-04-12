import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "About · UK Fuel Prices Map",
  description:
    "About the UK Fuel Prices Map — data attribution, sources, and credits.",
}

const RETAILERS: { name: string; url: string }[] = [
  { name: "Asda", url: "https://storelocator.asda.com/fuel_prices_data.json" },
  {
    name: "BP",
    url: "https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json",
  },
  { name: "Esso", url: "https://fuelprices.esso.co.uk/latestdata.json" },
  { name: "JET", url: "https://jetlocal.co.uk/fuel_prices_data.json" },
  {
    name: "Morrisons",
    url: "https://www.morrisons.com/fuel-prices/fuel.json",
  },
  {
    name: "Motor Fuel Group",
    url: "https://fuel.motorfuelgroup.com/fuel_prices_data.json",
  },
  {
    name: "Rontec",
    url: "https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json",
  },
  {
    name: "Sainsbury's",
    url: "https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json",
  },
  {
    name: "SGN",
    url: "https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json",
  },
  {
    name: "Tesco",
    url: "https://www.tesco.com/fuel_prices/fuel_prices_data.json",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-svh w-full bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
        <div className="mb-6">
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            ← Back to map
          </Button>
        </div>

        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            About
          </h1>
          <p className="text-sm text-muted-foreground">
            UK Fuel Prices Map — a simple, fast way to browse live forecourt
            prices across the United Kingdom.
          </p>
        </header>

        <Separator className="my-8" />

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">
            Data attribution
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              The fuel price data shown on this site is not mine.
            </strong>{" "}
            It is published by the individual retailers listed below under the
            UK Government&apos;s fuel finder scheme, which requires large fuel
            retailers to publish their pump prices within 30 minutes of any
            change. All prices, brands, locations, and other station details
            remain the property of their respective owners.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This site simply fetches, aggregates, and displays those public
            feeds. Prices may be delayed, incorrect, or out of date — always
            check the forecourt before fuelling. Nothing on this site should be
            considered a guarantee of price or availability.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-heading text-lg font-medium">Data sources</h2>
          <p className="text-sm text-muted-foreground">
            Prices are fetched directly from the following retailer feeds:
          </p>
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {RETAILERS.map((r) => (
              <li key={r.name}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {r.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Read more about the scheme on{" "}
            <a
              href="https://www.gov.uk/guidance/fuel-finder-scheme-information-for-fuel-retailers"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline"
            >
              gov.uk
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-heading text-lg font-medium">Credits</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This site was built by{" "}
            <span className="font-medium text-foreground">Ahmet Kilinc</span>.
            Map tiles are provided by OpenStreetMap contributors.
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              Website —{" "}
              <a
                href="https://ahmet.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                ahmet.gg
              </a>
            </li>
            <li>
              GitHub —{" "}
              <a
                href="https://github.com/ahmetskilinc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                github.com/ahmetskilinc
              </a>
            </li>
            <li>
              Twitter / X —{" "}
              <a
                href="https://x.com/bruvimtired"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                x.com/bruvimtired
              </a>
            </li>
          </ul>
        </section>

        <Separator className="my-8" />

        <footer className="text-xs text-muted-foreground">
          No personal data is collected. This is a personal project and is not
          affiliated with, endorsed by, or connected to any of the retailers
          listed above or the UK Government.
        </footer>
      </div>
    </div>
  )
}

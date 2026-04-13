import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft02Icon,
  Database02Icon,
  RefreshIcon,
  MapsLocation01Icon,
  InformationCircleIcon,
  Link04Icon,
  PlusSignIcon,
  Globe02Icon,
  GithubIcon,
  NewTwitterIcon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons"

export const metadata: Metadata = {
  title: "About · UK Fuel Prices Map",
  description:
    "About the UK Fuel Prices Map — how it works, data attribution, sources, FAQ, and credits.",
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

const STEPS: {
  title: string
  body: string
  icon: typeof Database02Icon
}[] = [
  {
    title: "Fetch",
    body: "Every few minutes we pull the public JSON price feed from each of the 10 major UK retailers.",
    icon: RefreshIcon,
  },
  {
    title: "Aggregate",
    body: "Stations are normalised, de-duplicated, and tagged by fuel type (E10, E5, B7, SDV).",
    icon: Database02Icon,
  },
  {
    title: "Display",
    body: "Everything lands on a single Apple Maps view you can search, filter and pan in real time.",
    icon: MapsLocation01Icon,
  },
]

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "How fresh is the data?",
    a: "We re-fetch every retailer feed regularly throughout the day. The Fuel Finder scheme requires retailers to publish price changes within 30 minutes, so prices here are typically minutes — not hours — old. That said, always check the actual pump.",
  },
  {
    q: "Why is my local petrol station missing?",
    a: "Only the 10 major UK retailers listed under the Fuel Finder scheme are required to publish their prices. Independent forecourts and smaller chains outside the scheme will not appear here.",
  },
  {
    q: "Are the prices guaranteed to be accurate?",
    a: "No. We display the data exactly as the retailers publish it. Feeds can be delayed, contain typos, or briefly go offline. Treat everything you see here as a guide — the price on the forecourt sign is the one that counts.",
  },
  {
    q: "How do I report a wrong price or a missing station?",
    a: (
      <>
        Wrong prices need to be reported to the retailer directly — we
        cannot edit their feeds. For bugs with the site itself, please open
        an issue on{" "}
        <a
          href="https://github.com/ahmetskilinc/fuel-price-uk/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline-offset-4 hover:underline"
        >
          GitHub
        </a>
        .
      </>
    ),
  },
  {
    q: "Do you track me or store my location?",
    a: "No. There are no analytics, no tracking cookies, and no accounts. The map itself is Apple Maps, served via Apple's MapKit JS — tiles are requested from Apple under our developer credentials, not yours. If you use any location features, your coordinates stay in your browser.",
  },
]

const CREDIT_LINKS: {
  icon: typeof Globe02Icon
  label: string
  href: string
}[] = [
  { icon: Globe02Icon, label: "ahmet.gg", href: "https://ahmet.gg" },
  {
    icon: GithubIcon,
    label: "ahmetskilinc",
    href: "https://github.com/ahmetskilinc",
  },
  {
    icon: NewTwitterIcon,
    label: "bruvimtired",
    href: "https://x.com/bruvimtired",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-svh w-full bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        <div className="mb-6">
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              size={14}
              strokeWidth={2}
            />
            Back to map
          </Button>
        </div>

        <header className="space-y-4">
          <Badge variant="secondary" className="rounded-full">
            United Kingdom
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            About this project
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            UK Fuel Prices Map is a simple, fast way to browse live forecourt
            prices across the United Kingdom — pulled directly from the major
            retailers&apos; public price feeds and plotted on a single map.
          </p>
          <p className="text-sm text-muted-foreground">
            Free. No tracking. No accounts. Just prices.
          </p>
        </header>

        <Separator className="my-10" />

        <div className="space-y-10">
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                How it works
              </h2>
              <p className="text-sm text-muted-foreground">
                From retailer feeds to the map in three steps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Card key={step.title} size="sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted ring-1 ring-foreground/10">
                        <HugeiconsIcon
                          icon={step.icon}
                          size={16}
                          strokeWidth={2}
                        />
                      </div>
                      <span className="font-heading text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <CardTitle className="mt-2">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={16}
                    strokeWidth={2}
                  />
                  <CardTitle>Data attribution</CardTitle>
                </div>
                <CardDescription>
                  Where the prices come from, and what they are not.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">
                    The fuel price data shown on this site is not mine.
                  </strong>{" "}
                  It is published by the individual retailers listed below
                  under the UK Government&apos;s fuel finder scheme, which
                  requires large fuel retailers to publish their pump prices
                  within 30 minutes of any change. All prices, brands,
                  locations, and other station details remain the property of
                  their respective owners.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This site simply fetches, aggregates, and displays those
                  public feeds. Prices may be delayed, incorrect, or out of
                  date — always check the forecourt before fuelling. Nothing
                  on this site should be considered a guarantee of price or
                  availability.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Database02Icon}
                    size={16}
                    strokeWidth={2}
                  />
                  <CardTitle>Data sources</CardTitle>
                </div>
                <CardDescription>
                  Prices are fetched directly from the following retailer
                  feeds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RETAILERS.map((r) => (
                    <li key={r.name}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                      >
                        <span className="text-foreground">{r.name}</span>
                        <HugeiconsIcon
                          icon={Link04Icon}
                          size={12}
                          strokeWidth={2}
                          className="text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                        />
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
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Frequently asked questions
              </h2>
              <p className="text-sm text-muted-foreground">
                The short answers to the things people usually ask.
              </p>
            </div>

            <Card>
              <CardContent className="divide-y divide-foreground/10 px-0">
                {FAQS.map((faq) => (
                  <details
                    key={faq.q}
                    className="group px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                      <span className="font-heading">{faq.q}</span>
                      <HugeiconsIcon
                        icon={PlusSignIcon}
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                      />
                    </summary>
                    <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Credits</CardTitle>
                <CardDescription>
                  Built by{" "}
                  <span className="font-medium text-foreground">
                    Ahmet Kilinc
                  </span>
                  . Map rendered with Apple MapKit JS.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {CREDIT_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                      >
                        <HugeiconsIcon
                          icon={link.icon}
                          size={14}
                          strokeWidth={2}
                          className="text-muted-foreground"
                        />
                        <span className="text-foreground">{link.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>

        <Separator className="my-10" />

        <footer className="flex items-start gap-2 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={ShieldUserIcon}
            size={12}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <p>
            No personal data is collected. This is a personal project and is
            not affiliated with, endorsed by, or connected to any of the
            retailers listed above or the UK Government.
          </p>
        </footer>
      </div>
    </div>
  )
}

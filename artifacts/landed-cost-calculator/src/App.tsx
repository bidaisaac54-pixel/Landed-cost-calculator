import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Calculator,
  CheckCircle2,
  ExternalLink,
  Info,
  Landmark,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'UGX' | 'KES' | 'TZS' | 'NGN' | 'ZAR' | 'CAD' | 'AUD';

type CalculatorInputs = {
  goodsCost: string;
  quantity: string;
  shipping: string;
  insurance: string;
  dutyRate: string;
  vatRate: string;
  otherFees: string;
  currency: CurrencyCode;
};

type Calculation = {
  cif: number;
  duty: number;
  vat: number;
  total: number;
  additional: number;
  perUnit: number;
  increase: number | null;
  goods: number;
  shipping: number;
  insurance: number;
  otherFees: number;
  quantity: number;
};

const defaultInputs: CalculatorInputs = {
  goodsCost: '1000',
  quantity: '100',
  shipping: '200',
  insurance: '20',
  dutyRate: '5',
  vatRate: '0',
  otherFees: '50',
  currency: 'USD',
};

const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'UGX', 'KES', 'TZS', 'NGN', 'ZAR', 'CAD', 'AUD'];

const moneyFields: Array<{ key: 'goodsCost' | 'shipping' | 'insurance' | 'otherFees'; label: string; hint: string }> = [
  { key: 'goodsCost', label: 'Product / goods cost', hint: 'Purchase price of the goods' },
  { key: 'shipping', label: 'Shipping / freight', hint: 'Transport to the destination' },
  { key: 'insurance', label: 'Insurance', hint: 'Cargo insurance for this shipment' },
  { key: 'otherFees', label: 'Other import / clearance fees', hint: 'Brokerage, handling, port or clearance fees' },
];

function numericValue(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed <= Number.MAX_SAFE_INTEGER ? parsed : null;
}

function validateInputs(inputs: CalculatorInputs): string[] {
  const errors: string[] = [];
  const fields: Array<[string, string]> = [
    ['goods cost', inputs.goodsCost],
    ['quantity', inputs.quantity],
    ['shipping / freight', inputs.shipping],
    ['insurance', inputs.insurance],
    ['customs duty rate', inputs.dutyRate],
    ['VAT/GST rate', inputs.vatRate],
    ['other import / clearance fees', inputs.otherFees],
  ];

  fields.forEach(([label, value]) => {
    const parsed = numericValue(value);
    if (parsed === null) errors.push(`Enter a valid number for ${label}.`);
    else if (parsed < 0) errors.push(`${label[0].toUpperCase()}${label.slice(1)} cannot be negative.`);
  });

  const quantity = numericValue(inputs.quantity);
  if (quantity !== null && quantity <= 0) errors.push('Quantity must be greater than zero.');
  return errors;
}

function calculateLandedCost(inputs: CalculatorInputs): Calculation | null {
  if (validateInputs(inputs).length > 0) return null;
  const goods = numericValue(inputs.goodsCost)!;
  const quantity = numericValue(inputs.quantity)!;
  const shipping = numericValue(inputs.shipping)!;
  const insurance = numericValue(inputs.insurance)!;
  const dutyRate = numericValue(inputs.dutyRate)!;
  const vatRate = numericValue(inputs.vatRate)!;
  const otherFees = numericValue(inputs.otherFees)!;
  const cif = goods + shipping + insurance;
  const duty = cif * dutyRate / 100;
  const vat = (cif + duty) * vatRate / 100;
  const total = cif + duty + vat + otherFees;
  const perUnit = total / quantity;
  const values = [cif, duty, vat, total, perUnit];
  if (values.some((value) => !Number.isFinite(value))) return null;
  return {
    cif,
    duty,
    vat,
    total,
    additional: total - goods,
    perUnit,
    increase: goods > 0 ? ((total - goods) / goods) * 100 : null,
    goods,
    shipping,
    insurance,
    otherFees,
    quantity,
  };
}

function formatCurrency(value: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  suffix,
  testId,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  suffix?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold tracking-[-0.01em] text-[hsl(var(--foreground))]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          data-testid={testId}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={onChange}
          className={`number-field w-full rounded-lg border bg-[hsl(var(--background))] px-4 text-base font-medium text-[hsl(var(--foreground))] ${suffix ? 'pr-12' : ''}`}
          aria-describedby={`${id}-hint`}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono-display text-sm text-[hsl(var(--muted-foreground))]">{suffix}</span>}
      </div>
      <p id={`${id}-hint`} className="text-xs leading-4 text-[hsl(var(--muted-foreground))]">{hint}</p>
    </div>
  );
}

function BreakdownRow({ label, value, strong = false, muted = false }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'pt-4' : ''} ${muted ? 'text-[hsl(var(--muted-foreground))]' : ''}`}>
      <dt className={`${strong ? 'font-bold text-[hsl(var(--foreground))]' : 'text-sm'}`}>{label}</dt>
      <dd className={`shrink-0 font-mono-display text-sm tabular-nums ${strong ? 'font-bold text-[hsl(var(--foreground))]' : ''}`}>{value}</dd>
    </div>
  );
}

type SupportingPage = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

const supportingPages: SupportingPage[] = [
  {
    path: '/import-duty-calculator/',
    title: 'Import Duty Calculator - Estimate Customs Duty',
    description: 'Estimate import duty from your customs value and the duty rate supplied for your shipment. Learn what can affect the final amount.',
    eyebrow: 'Import duty, made clearer',
    heading: 'Estimate the duty before your shipment lands.',
    intro: 'Import duty is one part of landed cost. This guide explains the basic estimate and shows why the rate and customs value must match your specific shipment.',
    sections: [
      { heading: 'The basic import duty calculation', body: 'A planning estimate is customs value multiplied by the applicable duty rate. If the customs value is 1,220 and the duty rate is 5%, the estimated duty is 61. The main calculator combines this result with freight, insurance, tax and other fees.' },
      { heading: 'Why the rate matters', body: 'Duty rates can differ by product classification, country of origin, destination and trade arrangement. Use the rate provided by the relevant customs authority or your customs broker instead of assuming a rate from another shipment.' },
      { heading: 'Use the result in landed cost', body: 'Duty is not the full import cost. Add it to transport, insurance, import taxes and clearance costs to understand what the goods cost when they reach your inventory.' },
    ],
  },
  {
    path: '/customs-duty-calculator/',
    title: 'Customs Duty Calculator - Calculate Duty on Imports',
    description: 'Calculate an estimated customs duty amount using your shipment value and applicable tariff rate, with practical guidance on classification and origin.',
    eyebrow: 'Customs duty guide',
    heading: 'Turn a tariff rate into a useful shipment estimate.',
    intro: 'A customs duty calculator is useful when you already know, or have been given, the rate for the product and destination. It does not replace tariff classification or an official customs ruling.',
    sections: [
      { heading: 'Start with the customs value', body: 'The customs value is the value used by the destination authority for assessment. It may relate to the transaction price, freight, insurance or other valuation rules. Confirm the correct base for your shipment before relying on an estimate.' },
      { heading: 'Classification and origin come first', body: 'An HS or HTS classification and the origin of the goods can affect the rate. Prefer the official tariff schedule for the destination country, and keep supporting documents for the classification you use.' },
      { heading: 'Duty is only one line item', body: 'After estimating duty, add VAT or GST where applicable, plus brokerage, port, handling and other import costs. That combined figure is more useful for pricing than the tariff line by itself.' },
    ],
  },
  {
    path: '/import-tax-calculator/',
    title: 'Import Tax Calculator - Estimate VAT or GST on Imports',
    description: 'Estimate import VAT or GST from your taxable base and supplied rate, then combine it with duty and fees for a fuller landed cost view.',
    eyebrow: 'Import tax, explained',
    heading: 'See how import tax changes the delivered cost.',
    intro: 'Import VAT and GST can add a meaningful amount to an order. This guide shows the general estimate used by the calculator while keeping the limits of jurisdiction-specific tax rules clear.',
    sections: [
      { heading: 'A general VAT or GST estimate', body: 'This calculator applies the supplied VAT/GST rate to CIF value plus customs duty. CIF is goods cost plus freight plus insurance. This is a planning method, not a universal legal tax base.' },
      { heading: 'Tax bases vary', body: 'Some jurisdictions include additional taxes, excise, fees or different freight amounts in the taxable base. Recoverable input tax may also affect the way a business evaluates the cost. Check the destination tax authority’s rules.' },
      { heading: 'Plan with the full picture', body: 'Use the tax estimate alongside goods, freight, insurance, duty and clearance costs. The per-unit result helps you compare a supplier quote with the amount that will actually reach your stock.' },
    ],
  },
  {
    path: '/landed-cost-formula/',
    title: 'Landed Cost Formula - A Practical Import Cost Method',
    description: 'Learn the landed cost formula for goods, freight, insurance, customs duty, import tax and fees, with a worked example.',
    eyebrow: 'The formula',
    heading: 'A transparent formula for the cost that arrives.',
    intro: 'Landed cost is broader than the supplier invoice. A clear formula makes it easier to compare sourcing options, plan margins and see which costs are still uncertain.',
    sections: [
      { heading: 'The general formula', body: 'Landed Cost = Product Cost + Freight + Insurance + Customs Duty + Import Taxes + Brokerage + Port or Handling Fees + Other Import Costs. Not every shipment has every line, and some authorities calculate taxes from a different base.' },
      { heading: 'The calculator’s method', body: 'CIF = Goods + Freight + Insurance. Duty = CIF × Duty Rate ÷ 100. VAT/GST = (CIF + Duty) × VAT/GST Rate ÷ 100. Total Landed Cost = CIF + Duty + VAT/GST + Other Fees. Cost Per Unit = Total Landed Cost ÷ Quantity.' },
      { heading: 'Worked example', body: 'With 1,000 in goods, 200 freight, 20 insurance, 5% duty, 0% VAT/GST and 50 in other fees, CIF is 1,220, duty is 61 and total landed cost is 1,331. Across 100 units, the estimate is 13.31 per unit. These are illustrative planning values, not an official tariff.' },
    ],
  },
  {
    path: '/how-to-calculate-landed-cost/',
    title: 'How to Calculate Landed Cost - Step-by-Step Guide',
    description: 'Follow a practical step-by-step process to calculate landed cost, validate your inputs and estimate import cost per unit.',
    eyebrow: 'A practical walkthrough',
    heading: 'How to calculate landed cost without losing the small costs.',
    intro: 'A reliable estimate starts with a complete shipment picture. Gather the quote, transport costs and applicable rates before you compare suppliers or set a selling price.',
    sections: [
      { heading: '1. Gather the shipment inputs', body: 'Record the product cost, number of units, freight, insurance and any brokerage, port, handling or clearance charges. Keep all monetary inputs in the same currency for the estimate.' },
      { heading: '2. Add the applicable rates', body: 'Enter the duty and VAT/GST rates for the product, origin and destination. The calculator does not look up rates automatically, so you remain responsible for using current information from the relevant authority.' },
      { heading: '3. Review the total and unit cost', body: 'Check CIF, duty, tax, other fees, total landed cost and the increase over product cost. Divide the total by quantity to estimate the amount carried by each unit.' },
      { heading: '4. Verify before committing', body: 'Treat the result as a planning estimate. Customs valuation, exemptions, recoverable taxes and special charges can change the final amount on a real entry.' },
    ],
  },
  {
    path: '/fob-vs-cif/',
    title: 'FOB vs CIF - Understand Import Shipping Terms',
    description: 'Understand the difference between FOB and CIF shipping terms, what each price may include, and how they affect landed cost planning.',
    eyebrow: 'Shipping terms',
    heading: 'FOB vs CIF: compare quotes on the cost that matters.',
    intro: 'FOB and CIF describe different points in an international shipment. Knowing the difference helps you avoid comparing a factory quote with a delivered-cost figure as if they were the same.',
    sections: [
      { heading: 'What FOB usually means', body: 'FOB, or Free On Board, generally means the seller delivers the goods on board the vessel at the agreed port. The buyer commonly arranges or pays for the main ocean freight, insurance and destination import costs, subject to the exact contract and applicable Incoterms version.' },
      { heading: 'What CIF usually means', body: 'CIF, or Cost, Insurance and Freight, generally includes the goods, insurance and freight to the named destination port. It does not mean all destination charges, duties, taxes or final delivery are included. Confirm the named place and contract terms.' },
      { heading: 'How to use the comparison', body: 'Normalize the quotes into the same destination and currency, then add duty, taxes, clearance and local handling. The landed cost calculator helps turn either quote into a comparable planning estimate using the costs you know.' },
    ],
  },
];

function setMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function SeoHead({ title, description, path, breadcrumbs = [], robots = 'index, follow' }: { title: string; description: string; path: string; breadcrumbs?: Array<{ name: string; path: string }>; robots?: string }) {
  useEffect(() => {
    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', new URL(path, window.location.origin).href);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (robots.startsWith('noindex')) {
      existingCanonical?.remove();
    } else {
      const canonical = existingCanonical ?? document.createElement('link');
      if (!existingCanonical) {
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = new URL(path, window.location.origin).href;
    }

    const existingStructuredData = document.getElementById('route-structured-data');
    existingStructuredData?.remove();
    if (breadcrumbs.length > 0) {
      const script = document.createElement('script');
      script.id = 'route-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: new URL(crumb.path, window.location.origin).href,
        })),
      });
      document.head.appendChild(script);
    }
  }, [title, description, path, breadcrumbs]);

  return null;
}

function SiteHeader() {
  return (
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.84)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/landed-cost-calculator/" className="focus-ring inline-flex items-center gap-3 rounded-md" data-testid="link-home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            <PackageCheck size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-[-0.02em] text-[hsl(var(--foreground))] sm:text-base">Landed Cost Calculator</span>
        </a>
        <a href="/landed-cost-calculator/" className="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">Open calculator</a>
      </div>
    </header>
  );
}

function RelatedTools() {
  return (
    <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)]" aria-labelledby="related-tools-heading">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="mb-2 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Keep exploring</p>
        <h2 id="related-tools-heading" className="text-2xl font-bold tracking-[-0.04em]">Related import cost guides</h2>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          {supportingPages.map((page) => (
            <a key={page.path} href={page.path} className="focus-ring rounded-md text-sm font-semibold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent)/.55)] underline-offset-4 hover:text-[hsl(var(--accent))]">
              {page.heading.replace(/\.$/, '')}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportingPage({ page }: { page: SupportingPage }) {
  return (
    <div className="site-shell min-h-[100dvh] overflow-x-hidden">
      <SeoHead
        title={page.title}
        description={page.description}
        path={page.path}
        breadcrumbs={[
          { name: 'Landed Cost Calculator', path: '/landed-cost-calculator/' },
          { name: page.heading.replace(/\.$/, ''), path: page.path },
        ]}
      />
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-16">
          <div className="max-w-3xl">
            <p className="mb-4 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">{page.eyebrow}</p>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.055em] sm:text-5xl">{page.heading}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">{page.intro}</p>
            <a href="/landed-cost-calculator/" className="focus-ring mt-7 inline-flex min-h-11 items-center rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5">Use the landed cost calculator</a>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {page.sections.map((section, index) => (
              <article key={section.heading} className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 ${index === page.sections.length - 1 && page.sections.length % 2 !== 0 ? 'md:col-span-2 md:max-w-[calc(50%-0.5rem)]' : ''}`}>
                <p className="mb-5 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">0{index + 1}</p>
                <h2 className="text-xl font-bold tracking-[-0.035em]">{section.heading}</h2>
                <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
        <RelatedTools />
      </main>
      <footer className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto max-w-6xl px-4 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:px-6 lg:px-8">
          For import planning, pricing and margin estimates. Verify rates with the relevant customs or tax authority.
        </div>
      </footer>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="site-shell min-h-[100dvh] overflow-x-hidden">
      <SeoHead title="Page not found - Landed Cost Calculator" description="The page you requested could not be found." path="/" robots="noindex, nofollow" />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="mb-4 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">404 / Not found</p>
        <h1 className="text-4xl font-bold tracking-[-0.055em] sm:text-5xl">That page isn’t here.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))]">The address may be out of date. Return to the calculator to estimate the true cost of your imported goods.</p>
        <a href="/landed-cost-calculator/" className="focus-ring mt-7 inline-flex min-h-11 items-center rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-bold text-[hsl(var(--primary-foreground))]">Open the calculator</a>
      </main>
    </div>
  );
}

function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const errors = useMemo(() => validateInputs(inputs), [inputs]);
  const calculation = useMemo(() => calculateLandedCost(inputs), [inputs]);

  const updateInput = (key: keyof CalculatorInputs, value: string) => {
    setInputs((current) => ({ ...current, [key]: key === 'currency' ? value as CurrencyCode : value }));
  };

  const resetDefaults = () => setInputs(defaultInputs);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <div className="site-shell min-h-[100dvh] overflow-x-hidden">
      <SeoHead
        title="Landed Cost Calculator - Calculate Your Total Import Cost"
        description="Calculate the true landed cost of imported goods including product price, shipping, insurance, customs duty, taxes, and other import fees."
        path="/landed-cost-calculator/"
      />
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.84)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/landed-cost-calculator/" className="focus-ring inline-flex items-center gap-3 rounded-md" data-testid="link-home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              <PackageCheck size={19} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-[-0.02em] text-[hsl(var(--foreground))] sm:text-base">Landed Cost Calculator</span>
          </a>
          <a href="#how-it-works" className="focus-ring hidden rounded-md px-3 py-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] sm:inline-block" data-testid="link-methodology">How it works</a>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-16">
          <div className="mb-8 max-w-2xl reveal">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" aria-hidden="true" />
              Import planning tool
            </div>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.04] tracking-[-0.055em] text-[hsl(var(--foreground))] sm:text-5xl lg:text-[4.2rem]">Know the cost <span className="text-[hsl(var(--accent))]">before</span> it lands.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">Estimate the true cost of imported goods, from supplier price to your door. Enter your shipment costs and applicable rates; the answer updates as you work.</p>
          </div>

          <div id="calculator" className="grid scroll-mt-6 gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(350px,.94fr)] lg:items-start">
            <section className="reveal reveal-delay rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-5 shadow-[0_10px_30px_hsl(215_39%_17%/.05)] sm:p-7" aria-labelledby="inputs-heading">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">01 / Shipment inputs</p>
                  <h2 id="inputs-heading" className="text-2xl font-bold tracking-[-0.04em]">Build your estimate</h2>
                </div>
                <Calculator className="mt-1 shrink-0 text-[hsl(var(--muted-foreground))]" size={22} aria-hidden="true" />
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="grid gap-6 sm:grid-cols-2">
                  {moneyFields.map((field) => (
                    <Field
                      key={field.key}
                      id={field.key}
                      label={field.label}
                      hint={field.hint}
                      value={inputs[field.key]}
                      onChange={(event) => updateInput(field.key, event.target.value)}
                      testId={`input-${field.key}`}
                    />
                  ))}
                  <Field id="quantity" label="Quantity" hint="Number of units in the shipment" value={inputs.quantity} onChange={(event) => updateInput('quantity', event.target.value)} testId="input-quantity" />
                  <Field id="dutyRate" label="Customs duty rate" hint="Rate applicable to this shipment" value={inputs.dutyRate} onChange={(event) => updateInput('dutyRate', event.target.value)} suffix="%" testId="input-duty-rate" />
                  <Field id="vatRate" label="Import VAT/GST rate" hint="Use 0 if it does not apply" value={inputs.vatRate} onChange={(event) => updateInput('vatRate', event.target.value)} suffix="%" testId="input-vat-rate" />
                  <div className="space-y-2">
                    <label htmlFor="currency" className="block text-sm font-semibold tracking-[-0.01em]">Currency</label>
                    <select id="currency" data-testid="select-currency" value={inputs.currency} onChange={(event) => updateInput('currency', event.target.value)} className="number-field focus-ring w-full appearance-none rounded-lg border bg-[hsl(var(--background))] px-4 text-base font-medium text-[hsl(var(--foreground))]">
                      {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                    <p className="text-xs leading-4 text-[hsl(var(--muted-foreground))]">Formatting only — no currency conversion.</p>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-5">
                  <p className="inline-flex items-center gap-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><Info size={15} aria-hidden="true" /> All monetary inputs use {inputs.currency}.</p>
                  <button type="button" onClick={resetDefaults} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))]" data-testid="button-reset-defaults">
                    <RotateCcw size={15} aria-hidden="true" /> Reset defaults
                  </button>
                </div>
                {errors.length > 0 && (
                  <div role="alert" className="mt-5 rounded-lg border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm font-medium leading-5 text-[hsl(var(--destructive))]" data-testid="status-validation-error">
                    {errors[0]}
                  </div>
                )}
              </form>
            </section>

            <section className="result-card reveal reveal-delay rounded-2xl p-5 text-[hsl(var(--primary-foreground))] sm:p-7" aria-labelledby="result-heading" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary-foreground)/.64)]">02 / Your estimate</p>
                <CheckCircle2 className="text-[hsl(var(--accent))]" size={21} aria-hidden="true" />
              </div>
              <h2 id="result-heading" className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary-foreground)/.68)]">Total landed cost</h2>
              <div className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-mono-display text-[clamp(2.1rem,9vw,4.15rem)] font-bold leading-none tracking-[-0.09em] text-[hsl(var(--primary-foreground))]" data-testid="text-total-landed-cost">
                {calculation ? formatCurrency(calculation.total, inputs.currency) : '—'}
              </div>
              <div className="mt-8 border-t border-[hsl(var(--primary-foreground)/.17)] pt-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary-foreground)/.68)]">Landed cost per unit</h3>
                <div className="mt-2 font-mono-display text-3xl font-bold tracking-[-0.06em]" data-testid="text-cost-per-unit">{calculation ? formatCurrency(calculation.perUnit, inputs.currency) : '—'}</div>
              </div>
              <p className="mt-7 text-sm leading-6 text-[hsl(var(--primary-foreground)/.75)]" data-testid="text-result-explanation">
                {calculation
                  ? `Your estimated landed cost is ${formatCurrency(calculation.total, inputs.currency)} for ${calculation.quantity} units, or ${formatCurrency(calculation.perUnit, inputs.currency)} per unit. This includes the goods, freight, insurance, estimated duty, VAT/GST and other fees entered above.`
                  : 'Complete the highlighted inputs to see your estimate.'}
              </p>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(350px,.94fr)]">
            <details id="how-it-works" className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.56)] px-5 py-1 sm:px-7">
              <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:hidden">
                <span className="inline-flex items-center gap-3"><ReceiptText size={18} className="text-[hsl(var(--accent))]" aria-hidden="true" /> How is this calculated?</span>
                <span className="text-xl font-normal text-[hsl(var(--muted-foreground))] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="border-t border-[hsl(var(--border))] pb-5 pt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <ol className="space-y-3">
                  <li><strong className="text-[hsl(var(--foreground))]">1. CIF value:</strong> Goods + Freight + Insurance.</li>
                  <li><strong className="text-[hsl(var(--foreground))]">2. Customs duty:</strong> CIF × Duty rate ÷ 100.</li>
                  <li><strong className="text-[hsl(var(--foreground))]">3. VAT/GST:</strong> (CIF + Duty) × VAT/GST rate ÷ 100.</li>
                  <li><strong className="text-[hsl(var(--foreground))]">4. Other fees:</strong> Added as entered for clearance, handling and related charges.</li>
                  <li><strong className="text-[hsl(var(--foreground))]">5. Total landed cost:</strong> CIF + Duty + VAT/GST + Other fees.</li>
                  <li><strong className="text-[hsl(var(--foreground))]">6. Cost per unit:</strong> Total landed cost ÷ Quantity.</li>
                </ol>
                <p className="mt-4 border-l-2 border-[hsl(var(--accent))] pl-3">This is a general planning estimate. Exact tax bases and customs valuation methods vary by jurisdiction; some may include additional taxes, treat freight differently, or handle recoverable VAT differently.</p>
              </div>
            </details>

            <aside className="rounded-2xl border border-[hsl(var(--accent)/.26)] bg-[hsl(var(--accent)/.07)] px-5 py-5 sm:px-7" data-testid="text-disclaimer">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" size={19} aria-hidden="true" />
                <p className="text-xs leading-5 text-[hsl(var(--foreground)/.78)]">This calculator provides a general landed-cost estimate. Actual customs duty, VAT/GST, fees and valuation rules vary by country, product classification, origin and shipment. Verify the applicable rates with the relevant customs or tax authority before making a final purchasing or import decision.</p>
              </div>
            </aside>
          </div>

          {calculation && (
            <section className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-5 sm:p-7" aria-labelledby="breakdown-heading">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-2 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">The numbers behind the answer</p>
                  <h2 id="breakdown-heading" className="text-2xl font-bold tracking-[-0.04em]">Cost breakdown</h2>
                </div>
                {calculation.increase !== null && <p className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--secondary-foreground))]" data-testid="text-increase-over-goods">↑ {calculation.increase.toFixed(1)}% increase over goods cost</p>}
              </div>
              <dl className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
                <BreakdownRow label="Goods" value={formatCurrency(calculation.goods, inputs.currency)} />
                <BreakdownRow label="Freight" value={formatCurrency(calculation.shipping, inputs.currency)} />
                <BreakdownRow label="Insurance" value={formatCurrency(calculation.insurance, inputs.currency)} />
                <BreakdownRow label="CIF value" value={formatCurrency(calculation.cif, inputs.currency)} />
                <BreakdownRow label="Customs duty" value={formatCurrency(calculation.duty, inputs.currency)} />
                <BreakdownRow label="Taxes (VAT/GST)" value={formatCurrency(calculation.vat, inputs.currency)} />
                <BreakdownRow label="Other fees" value={formatCurrency(calculation.otherFees, inputs.currency)} />
                <BreakdownRow label="Total additional import costs" value={formatCurrency(calculation.additional, inputs.currency)} />
                <div className="hidden sm:block" aria-hidden="true" />
                <div className="border-t border-[hsl(var(--border))] sm:col-span-2" />
                <BreakdownRow label="Total landed cost" value={formatCurrency(calculation.total, inputs.currency)} strong />
                <BreakdownRow label="Cost per unit" value={formatCurrency(calculation.perUnit, inputs.currency)} strong />
              </dl>
            </section>
          )}
        </section>

        <section className="grid-paper border-y border-[hsl(var(--border))]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">A clearer view of every shipment</p>
              <h2 className="text-3xl font-bold tracking-[-0.05em] sm:text-4xl">The supplier price is only the beginning.</h2>
              <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">Use landed cost to make import decisions with the full picture in view—not just the line item on a quote.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.74)] p-5">
                <Truck className="mb-8 text-[hsl(var(--accent))]" size={22} aria-hidden="true" />
                <h3 className="text-lg font-bold tracking-[-0.03em]">Budget the journey</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Freight, insurance, customs duty and clearance fees can change the economics of a shipment.</p>
              </article>
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.74)] p-5">
                <Landmark className="mb-8 text-[hsl(var(--accent))]" size={22} aria-hidden="true" />
                <h3 className="text-lg font-bold tracking-[-0.03em]">Price with confidence</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Know your per-unit cost before setting a selling price or committing to an order.</p>
              </article>
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.74)] p-5">
                <PackageCheck className="mb-8 text-[hsl(var(--accent))]" size={22} aria-hidden="true" />
                <h3 className="text-lg font-bold tracking-[-0.03em]">Compare the real deal</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Compare suppliers and sourcing markets on the cost that reaches your inventory, not the advertised price.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr]">
            <div>
              <p className="mb-3 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Understand the total</p>
              <h2 className="text-3xl font-bold leading-tight tracking-[-0.05em] sm:text-4xl">The cost that matters is the cost that arrives.</h2>
            </div>
            <div className="space-y-10 text-base leading-7 text-[hsl(var(--muted-foreground))]">
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">What is landed cost?</h3>
                <p>Landed cost is the total cost of getting imported goods to their destination. It can include the purchase price, transport, insurance, customs duty, taxes and import or clearance fees.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">Why calculate landed cost?</h3>
                <p>A supplier price alone may not represent the true cost of imported inventory. A landed-cost estimate helps you set prices, compare suppliers, estimate margins and budget imports before money is committed.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">How to calculate landed cost</h3>
                <p>This calculator adds goods, freight and insurance to find CIF value, applies the duty rate you provide, then applies VAT/GST to CIF plus duty. Other fees are added at the end. The result is divided by quantity for cost per unit.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">What does landed cost include?</h3>
                <p>It can include the product price, freight, insurance, customs duty, import VAT or GST, brokerage, port and handling fees, and other costs needed to bring the goods to their destination. The exact list depends on the shipment.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">Landed cost per unit</h3>
                <p>Landed cost per unit is the total landed cost divided by the number of units. It gives you a more realistic starting point for pricing, margin planning and comparing different order quantities.</p>
              </article>
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-5">
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">Landed cost example</h3>
                <p>Using the calculator defaults—{formatCurrency(1000, inputs.currency)} goods, {formatCurrency(200, inputs.currency)} freight, {formatCurrency(20, inputs.currency)} insurance, 5% duty, 0% VAT/GST and {formatCurrency(50, inputs.currency)} other fees—the estimated total is <strong className="text-[hsl(var(--foreground))]">{formatCurrency(1331, inputs.currency)}</strong>, or <strong className="text-[hsl(var(--foreground))]">{formatCurrency(13.31, inputs.currency)}</strong> per unit across 100 units.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">Landed cost vs product cost</h3>
                <p>Product cost is what you pay the supplier for the goods. Landed cost is the broader amount required to get those goods to you. The difference is why a low unit quote can still produce a thin margin after import.</p>
              </article>
              <article>
                <h3 className="mb-2 text-xl font-bold tracking-[-0.035em] text-[hsl(var(--foreground))]">FOB vs CIF</h3>
                <p>FOB generally places the main carriage and later import costs with the buyer, while CIF generally includes freight and insurance to the named destination port. Neither quote automatically includes every destination duty, tax or local charge.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mb-10 max-w-xl">
              <p className="mb-3 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Questions, answered plainly</p>
              <h2 className="text-3xl font-bold tracking-[-0.05em]">Frequently asked questions</h2>
            </div>
            <div className="grid gap-x-10 md:grid-cols-2">
              {[
                ['What is landed cost?', 'Landed cost is the total cost of bringing imported goods to their destination, including the goods, transport, insurance, duty, taxes and relevant fees.'],
                ['How do you calculate landed cost?', 'This calculator uses CIF (goods + freight + insurance), adds customs duty, adds VAT/GST on CIF plus duty, then adds other import fees.'],
                ['Does landed cost include shipping?', 'Yes. Shipping or freight is included in the CIF value used by this general estimate.'],
                ['Does landed cost include customs duty?', 'Yes. Enter the duty rate applicable to your shipment and it will be calculated from CIF value.'],
                ['Does landed cost include VAT or GST?', 'Yes, when applicable. Enter the VAT/GST rate. This estimate applies it to CIF value plus customs duty; local tax bases can differ.'],
                ['How do I calculate landed cost per unit?', 'Divide total landed cost by the number of units in the shipment. The calculator performs this automatically and shows the result prominently.'],
                ['What is the difference between FOB and CIF?', 'FOB and CIF place different transport responsibilities and costs with the buyer and seller. Compare the named place and add destination costs before comparing quotes.'],
                ['Can I calculate landed cost without an HS code?', 'Yes, you can make a planning estimate with a duty rate you have been given. An HS code is still important for confirming the correct classification and official rate.'],
              ].map(([question, answer], index) => (
                <details key={question} className="group border-b border-[hsl(var(--border))] py-5">
                  <summary className="focus-ring flex cursor-pointer list-none items-start justify-between gap-4 text-base font-bold leading-6 marker:hidden" data-testid={`faq-question-${index + 1}`}>
                    {question}
                    <span className="shrink-0 text-xl font-normal text-[hsl(var(--accent))] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-prose pr-8 pt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16" aria-labelledby="sources-heading">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-start">
            <div>
              <p className="mb-3 font-mono-display text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">Know what is being estimated</p>
              <h2 id="sources-heading" className="text-2xl font-bold tracking-[-0.04em]">Methodology & official references</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <p className="text-sm font-bold">Calculation methodology</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The general customs valuation context is explained by the World Trade Organization.</p>
                <a href="https://www.wto.org/english/tratop_e/cusval_e/cusval_e.htm" target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md text-sm font-bold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent)/.55)] underline-offset-4 hover:text-[hsl(var(--accent))]" data-testid="link-wto-source">WTO customs valuation <ExternalLink size={14} aria-hidden="true" /></a>
              </div>
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <p className="text-sm font-bold">Actual duty / tax rates</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Rates depend on destination, origin, HS/HTS classification and local rules. For U.S. imports, use the official HTS maintained by the USITC.</p>
                <a href="https://hts.usitc.gov/" target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md text-sm font-bold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent)/.55)] underline-offset-4 hover:text-[hsl(var(--accent))]" data-testid="link-usitc-source">USITC Harmonized Tariff Schedule <ExternalLink size={14} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-[hsl(var(--border))] pt-6 text-xs leading-5 text-[hsl(var(--muted-foreground))]">This tool does not automatically determine customs rates. You provide the rates applicable to your shipment. Always verify them with the relevant customs or tax authority, especially where product classification, exemptions or recoverable taxes apply.</p>
        </section>
        <RelatedTools />
      </main>

      <footer className="border-t border-[hsl(var(--border))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>For import planning, pricing and margin estimates.</span>
          <span className="font-mono-display">No exchange rates. No guesswork.</span>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname.replace(/\/+$/, '') || '/';
  const supportingPage = supportingPages.find((page) => page.path.replace(/\/+$/, '') === pathname);

  if (supportingPage) return <SupportingPage page={supportingPage} />;
  if (pathname === '/' || pathname === '/landed-cost-calculator') return <CalculatorPage />;
  return <NotFoundPage />;
}

export default App;
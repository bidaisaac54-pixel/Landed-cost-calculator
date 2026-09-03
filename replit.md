# Landed Cost Calculator

A lightweight, browser-only calculator that helps importers estimate true landed cost per shipment and per unit.

## Run & Operate

- `pnpm --filter @workspace/landed-cost-calculator run dev` — run the calculator preview
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/landed-cost-calculator run build` — build the static frontend bundle (workflow supplies `PORT` and `BASE_PATH`)

## Stack

- pnpm workspace, Node.js 24, TypeScript 5.9
- React + Vite frontend with Tailwind CSS
- All calculations run locally in the browser; there is no backend, database, authentication, or external calculation service.

## Where things live

- `artifacts/landed-cost-calculator/src/App.tsx` — calculator logic, accessible form, results, breakdown, educational content and FAQs
- `artifacts/landed-cost-calculator/src/index.css` — visual tokens, responsive layout and component styling
- `artifacts/landed-cost-calculator/index.html` — SEO title, metadata and static entry point

## Architecture decisions

- Monetary inputs are interpreted in the selected currency for display only; the app never invents or applies exchange rates.
- The estimate uses a transparent general methodology: CIF, duty, VAT/GST on CIF plus duty, and other fees.
- The explanatory content is rendered in the initial HTML/React tree so it remains crawlable without relying on runtime data injection.

## Product

Users can edit shipment inputs and see total landed cost, cost per unit, a line-item breakdown, and the increase over goods cost update instantly. The page also explains the estimate, its limits, and where to verify actual rates.

## User preferences

The product brief prioritizes a fast, mobile-first, publishable experience with clear methodology and no fabricated claims or sources.

## Gotchas

- Actual customs rates and tax bases vary by jurisdiction; the UI must continue to state that rates are supplied by the user.
- The Vite build expects `PORT` and `BASE_PATH`; run it through the managed workflow or provide those variables for direct checks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

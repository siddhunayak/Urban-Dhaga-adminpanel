# Urban Dhaga — Admin Panel

The admin dashboard for **Urban Dhaga**. Store staff use it to manage products, inventory, orders, customers and store content.

> **Status:** Setup stage. The repository has its basic files, but no application code yet.

## Tech Stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | [Next.js](https://nextjs.org/) (App Router) + TypeScript          |
| Styling    | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (recommended)   |
| Backend    | See [Backend Options](#backend-options): not decided yet          |

## Planned Features

- **Dashboard:** sales overview, recent orders, low-stock alerts
- **Products:** create, edit and archive products, with variants (size, color), pricing and images
- **Inventory:** stock levels for each variant
- **Orders:** view orders, update their status (pending → shipped → delivered), handle returns
- **Customers:** customer list and order history
- **Categories & Collections:** organise the catalogue
- **Auth & Roles:** admin login with role-based access (owner, staff)

## Backend Options

**Recommended: build the backend inside Next.js.**

- **API:** Next.js Route Handlers (`app/api/*`) and Server Actions
- **Database:** PostgreSQL, hosted on [Neon](https://neon.tech/) or [Supabase](https://supabase.com/)
- **ORM:** [Prisma](https://www.prisma.io/) or [Drizzle](https://orm.drizzle.team/)
- **Auth:** [Auth.js (NextAuth)](https://authjs.dev/), with roles stored in the database
- **Image storage:** Cloudinary, or S3-compatible storage such as Supabase Storage or Cloudflare R2
- **Payments (if the storefront needs them):** Razorpay or Stripe webhooks

With this setup, the frontend and backend live in one codebase and deploy together to Vercel. It works well while the admin panel is the only service that needs this data.

**Alternative: run a separate backend service.**

If the customer storefront and the admin panel will share one API, use a standalone service instead. Two common options are Node.js with Express or NestJS, and Supabase as a Backend-as-a-Service. The admin panel then calls that API.

## Getting Started

> The app hasn't been created yet. To create it in this repository:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
npm run dev
```

Then open <http://localhost:3000>.

### Environment Variables

Create a `.env.local` file. Never commit it. The variables below are examples and depend on which backend you choose:

```env
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure (planned)

```
src/
  app/
    (auth)/login/        # Admin login
    (dashboard)/         # Protected admin routes
      products/
      orders/
      customers/
      inventory/
    api/                 # Route Handlers (if the backend is in Next.js)
  components/            # Shared UI components
  lib/                   # DB client, auth, utilities
```

## Contributing

1. Create a branch from `main` (for example `feature/products-page`).
2. Commit your changes and open a pull request.

# NEXUS - Content Agency Platform Setup

This Next.js 14 project has been initialized with the following configuration:

## Tech Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (default style, zinc color scheme)
- **Code Quality**: ESLint + Prettier

## Installed Dependencies

### Core Libraries
- `@hello-pangea/dnd` - Drag and drop functionality
- `@tanstack/react-table` - Data table components
- `react-big-calendar` - Calendar views
- `date-fns` - Date utilities
- `zod` - Schema validation
- `uuid` - UUID generation
- `paymongo-node` - PayMongo payment integration
- `lucide-react` - Icon library

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Authentication routes
│   ├── (platform)/      # Platform routes (admin/team)
│   ├── (portal)/        # Client portal routes
│   ├── (website)/       # Public website routes
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout with Inter font
│   ├── page.tsx         # Home page (NEXUS)
│   └── globals.css      # Global styles with Tailwind + shadcn variables
├── components/
│   ├── ui/              # shadcn/ui components
│   └── shared/          # Shared custom components
├── lib/
│   ├── utils.ts         # Utility functions (cn helper)
│   └── constants.ts     # Status enums, color maps, roles
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
    └── index.ts         # Shared types (User, Module)
```

## Configuration Files

- `tsconfig.json` - TypeScript configuration with strict mode and `@/` path alias pointing to `src/`
- `tailwind.config.ts` - Tailwind configuration with shadcn/ui setup
- `components.json` - shadcn/ui configuration (default style, zinc colors)
- `.prettierrc` - Prettier configuration with Tailwind plugin
- `.eslintrc.json` - ESLint configuration with Prettier integration

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Next Steps

1. Set up database (PostgreSQL + Prisma)
2. Configure NextAuth.js for authentication
3. Set up Redis + BullMQ for job queues
4. Configure Cloudflare R2 for file storage
5. Add environment variables (.env)
6. Install additional shadcn/ui components as needed

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc.
```

Components will be added to `src/components/ui/`

## Environment Variables

Create a `.env` file in the root directory with required variables:

```env
DATABASE_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
# Add more as needed
```

## Build Verification

The project has been successfully built and verified. Run `npm run dev` to start the development server.

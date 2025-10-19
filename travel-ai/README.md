# Next.js 15 Application

A modern, full-stack Next.js application built with TypeScript, Tailwind CSS, and Zustand for state management.

## Features

- ⚡ **Next.js 15** with App Router
- 🔷 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🏪 **Zustand** for state management
- 📱 **Responsive Design** with mobile-first approach
- 🛠️ **ESLint & Prettier** for code quality
- 🚀 **Vercel** deployment ready

## Project Structure

\`\`\`
app/                    # Next.js App Router (main structure)
├── dashboard/          # Dashboard pages with layout
├── globals.css         # Global styles
├── layout.tsx          # Root layout
└── page.tsx           # Homepage

src/                    # Source files
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Button, Card, etc.)
│   └── dashboard/     # Dashboard-specific components
└── lib/               # Utility functions
\`\`\`

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- npm, yarn, or pnpm

### Installation & Setup

1. **Clone and install dependencies:**
   \`\`\`bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \`\`\`

2. **Environment setup:**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   Edit `.env.local` and add your environment variables.

3. **Start development server:**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   \`\`\`

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Windows Setup Notes

- **Use PowerShell or Windows Terminal.** Corepack comes bundled with Node.js 18+, so enable it once with `corepack enable pnpm` (run as administrator if you hit permission errors).
- **Install dependencies:** `pnpm install`
- **Apply database schema:** `pnpm db:push` (internally uses `cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 drizzle-kit push`, so it works the same on Windows, macOS, and Linux). Re-run this after editing Drizzle migrations.
- **Start developing:** `pnpm dev` and open `http://localhost:3000`
- **Troubleshooting:** If PowerShell refuses scripts, right-click the terminal and choose “Run as administrator”, then execute `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` once.

### 🚨 Common Setup Issues & Solutions

#### Issue: "Module not found" errors
**Solution:** The project uses mixed `app/` and `src/` structure. Make sure:
- UI components are in `src/components/ui/`
- Dashboard components are in `src/components/dashboard/`
- Pages are in `app/` directory

#### Issue: Import path errors (`@/` not resolving)
**Solution:** The tsconfig.json is configured with:
\`\`\`json
"paths": {
  "@/*": ["./src/*"],
  "@/app/*": ["./app/*"]
}
\`\`\`

#### Issue: Tailwind styles not loading
**Solution:** Make sure `app/globals.css` is imported in `app/layout.tsx`

#### Issue: TypeScript errors
**Solution:** Run `npm run lint:fix` to auto-fix common issues

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## State Management

The application uses Zustand for state management with the following stores:

- **User Store** - User authentication and profile data
- **App Store** - Application-wide settings (theme, sidebar state)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on every push

### Manual Deployment

1. Build the application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Start the production server:
   \`\`\`bash
   npm run start
   \`\`\`

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details

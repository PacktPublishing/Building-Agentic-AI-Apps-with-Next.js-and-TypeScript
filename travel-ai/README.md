# Travel AI - Next.js 15 Application

A modern, AI-powered travel planning application built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- ⚡ **Next.js 15** with App Router
- 🔷 **TypeScript** for type safety
- 🎨 **Tailwind CSS** for styling
- 🏪 **Zustand** for state management
- 🧩 **shadcn/ui** components
- 🛫 **Amadeus API** integration via MCP
- 📱 **Responsive design**
- 🎯 **Modern UI/UX**

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd travel-ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
travel-ai/
├── app/                    # Next.js 13+ app directory
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── dashboard/         # Dashboard-specific components
│   └── ui/               # UI components (shadcn/ui)
├── lib/                   # Utility functions
└── public/               # Static assets
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm format` - Format code with Prettier

## API Integration

This application integrates with the Amadeus MCP server for:

- ✈️ Flight search and booking
- 🏨 Hotel search and reservations  
- 🗺️ Activity and tour recommendations
- 📊 Travel analytics and insights

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Linting**: ESLint + Prettier

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is part of the "Building Agentic AI Apps with Next.js and TypeScript" book by Packt Publishing.

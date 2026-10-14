# Mikhail Builds Website Template for Beginners

A modern, beginner-friendly Next.js template designed for rapid web development with Cursor IDE integration.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript for type safety
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 with custom animations
- **Development**: Turbopack for fast builds
- **Linting**: ESLint with Next.js configuration
- **Build Tool**: PostCSS with Autoprefixer

## Features

- **Modern UI Components**: Pre-built Hero component with animated gradient backgrounds
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **TypeScript Support**: Full type checking and IntelliSense
- **Custom Animations**: Blob animations and smooth transitions
- **Developer Experience**: Optimized with Turbopack for lightning-fast development
- **Cursor IDE Integration**: Designed to work seamlessly with Cursor's AI agent
- **Authentication Ready**: Clerk integration guide included
- **Backend Ready**: Convex database integration guide included

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (recommended package manager for this template)
- [Cursor IDE](https://cursor.sh/) (recommended)

### Installation

1. **Download Cursor IDE**
   - Visit [cursor.sh](https://cursor.sh/) and download the latest version

2. **Clone the repository**
   ```bash
   git clone https://github.com/mwijanarko1/template.git
   cd template
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Start the development server**
   ```bash
   bun run dev
   ```

5. **Open Cursor Composer**
   - Press `CMD + I` to open the Composer
   - Make sure to select the "Agent" mode

6. **Use the AI Agent**
   - Copy the contents of the `docs/PROMPT.txt` file and paste it into the Composer Agent
   - Let the AI generate your project structure and components
   - Chat with the agent to build features - it will handle the coding for you

7. **Fix any issues**
   - If errors occur, copy/paste the error or screenshot it
   - Ask the agent to fix the specific error

## Project Structure

```
template/
├── docs/                       # Documentation and guides
│   ├── PROMPT.txt             # AI agent prompt instructions
│   ├── CURSOR_GUIDE.md        # Comprehensive Cursor IDE guide
│   ├── clerk/                 # Clerk authentication guides
│   │   └── clerk-auth-guide.md
│   └── convex/                # Convex database guides
│       ├── convex-db-guide.md
│       └── convex_rules.mdc
├── for-agent/                 # Agent-specific instructions
│   ├── deployment.txt         # Deployment guidelines
│   ├── guidelines.txt         # General coding guidelines
│   ├── modes.txt              # Agent modes and instructions
│   └── ui-guide.txt           # UI/UX guidelines
├── src/                       # Source code
│   ├── app/
│   │   ├── layout.tsx         # Root layout component
│   │   ├── page.tsx           # Home page
│   │   ├── globals.css        # Global styles
│   │   └── favicon.ico        # App favicon
│   └── components/
│       └── Hero.tsx           # Hero section component
├── tailwind.config.js         # Tailwind CSS configuration
├── next.config.mjs            # Next.js configuration
├── postcss.config.mjs         # PostCSS configuration
├── eslint.config.mjs          # ESLint configuration
└── package.json               # Dependencies and scripts
```

## Documentation

### Codebase Architecture
For a comprehensive overview of the codebase structure, architecture diagrams, data flows, and navigation guide, see [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md).

### Cursor IDE Guide
Check `docs/CURSOR_GUIDE.md` for detailed instructions on using Cursor IDE effectively with this template.

### Authentication (Clerk)
The `docs/clerk/` directory contains guides for integrating Clerk authentication into your project.

### Backend/Database (Convex)
The `docs/convex/` directory contains guides for setting up Convex as your backend and database solution.

### Agent Instructions
The `for-agent/` directory contains instructions that help the AI agent understand how to work with your project:
- **deployment.txt**: Deployment best practices
- **guidelines.txt**: General coding standards
- **modes.txt**: Different agent modes and when to use them
- **ui-guide.txt**: UI/UX design guidelines

## Testing

Run the test suite:

```bash
bun run test        # Watch mode
bun run test:run    # Single run
```

Tests use Vitest and React Testing Library. Add `*.test.tsx` files next to your components.

## Environment

Copy `.env.example` to `.env.local` and fill in values. Use `getEnv()` from `src/lib/env.ts` for validated access. Extend the Zod schema when adding Clerk, Convex, or other services.

## Customization

### Styling
- Modify `tailwind.config.js` to add custom colors, fonts, or animations
- Update `src/app/globals.css` for global styles
- Components use Tailwind utility classes for easy customization

### Components
- Add new components in `src/components/`
- Import and use them in your pages
- Follow the existing Hero component pattern

## Deployment

### Build for Production
```bash
bun run build
```

### Start Production Server
```bash
bun run start
```

The template is ready to deploy to Vercel, Netlify, or any other hosting platform that supports Next.js.

## Contributing

This template is designed to be extended and customized. Feel free to:
- Add new components
- Modify the styling
- Extend functionality
- Share your improvements

## License

This project is open source and available under the [MIT License](LICENSE).

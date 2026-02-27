# FindVan Dashboard

A modern, responsive OSINT + SDR dashboard for school transportation lead prospecting. Built with React 18, TypeScript, Vite, and TailwindCSS.

## Features

- **Lead Display**: View all captured leads in a sortable, filterable table
- **Advanced Filtering**: Filter by city, source, and validation status
- **Lead Details Modal**: View complete lead information with copy-to-clipboard functionality
- **Pagination**: Navigate through large lead datasets
- **Responsive Design**: Works seamlessly on desktop and tablet devices
- **Real-time Updates**: Integrates with Module 2 PostgreSQL database via API
- **Performance**: <2s page load, <500ms filter response times

## Tech Stack

- **Frontend Framework**: React 18.2.0 with TypeScript 5
- **Build Tool**: Vite 5 with HMR for fast development
- **Styling**: TailwindCSS 3.4 with custom utilities
- **HTTP Client**: Axios 1.6 with timeout and error handling
- **Icons**: Lucide React 0.575
- **Testing**: Vitest 1 with React Testing Library
- **State Management**: React Hooks (custom hooks for data/filters)

## Project Structure

```
packages/dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx           # Main layout and orchestration
│   │   ├── LeadsTable.tsx          # Table display with sorting
│   │   ├── FilterBar.tsx           # Filters (city/source/validity)
│   │   ├── LeadModal.tsx           # Detail view with copy functionality
│   │   ├── LoadingSpinner.tsx      # Loading indicator
│   │   └── __tests__/              # Component tests
│   ├── hooks/
│   │   ├── useLeads.ts            # Data fetching hook
│   │   └── useFilters.ts          # Filter state management
│   ├── services/
│   │   └── leads-api.ts           # Axios API wrapper
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── __tests__/
│   │   └── dashboard.integration.test.tsx # E2E tests
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # React entry point
│   └── index.css                  # TailwindCSS + utilities
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # TailwindCSS configuration
├── postcss.config.js              # PostCSS configuration
├── vitest.config.ts               # Vitest configuration
└── package.json                   # Dependencies and scripts
```

## Installation

### Prerequisites

- Node.js 18+ (run `nvm use 20` if available)
- npm or yarn package manager
- Module 2 backend running on `http://localhost:3001` (or configure API_BASE in `leads-api.ts`)

### Setup

```bash
# Install dependencies
npm install

# Environment setup (if needed, create .env file)
echo "VITE_API_BASE=/api" > .env.local
```

## Development

### Start Development Server

```bash
# Start Vite dev server with HMR
npm run dev

# Open in browser
# http://localhost:5173
```

Features:
- Lightning-fast Hot Module Replacement (HMR)
- Full TypeScript support with strict checking
- TailwindCSS JIT compilation

### Build for Production

```bash
# Create optimized production bundle
npm run build

# Output: dist/ folder with minified assets
# Bundle size: <200KB (gzipped)
```

### Preview Production Build

```bash
# Serve production build locally
npm run preview
```

## Testing

### Run All Tests

```bash
# Run full test suite (exit after completion)
npm test

# Watch mode for development
npm run test:watch
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage
```

### Run Specific Test File

```bash
# Example: test only LeadsTable
npm test LeadsTable.test.tsx

# Example: test only integration
npm test integration.test.tsx
```

### Test Structure

**Component Tests** (36 tests total):
- `LeadsTable.test.tsx`: 9 tests (rendering, sorting, empty state, click handlers)
- `FilterBar.test.tsx`: 10 tests (filter loading, selection, clear functionality)
- `LeadModal.test.tsx`: 12 tests (display, copy-to-clipboard, error states)
- `LoadingSpinner.test.tsx`: 2 tests (render, animation)
- `useLeads.test.ts`: 3 tests (data fetching, error handling)

**Integration Tests** (15 tests):
- `dashboard.integration.test.tsx`: Full end-to-end workflow testing

**Total**: 51 tests across all components

## Code Quality

### Type Checking

```bash
# Run TypeScript strict checks
npm run typecheck
```

Enforced rules:
- `strict: true` - Strict null checking, strict function types, etc.
- `noImplicitAny: true` - Require explicit types
- `esModuleInterop: true` - CommonJS/ES module compatibility

### Linting (if configured)

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## API Integration

### Lead Data Flow

```
Dashboard Component
    ↓
useLeads Hook (async fetch)
    ↓
leads-api.ts (Axios wrapper)
    ↓
GET /api/leads?page=1&limit=25&city=...&source=...
    ↓
Module 2 Backend (PostgreSQL)
    ↓
Return Lead[] with 15 fields
```

### API Endpoints

```typescript
// Get paginated leads with filters
GET /api/leads
  ?page=1
  &limit=25
  &city=São Paulo      (optional)
  &source=google_maps  (optional)
  &isValid=true        (optional)

Response:
{
  leads: Lead[],
  total: number,
  page: number,
  pages: number
}

// Get single lead by ID
GET /api/leads/:id
Response: Lead

// Get available cities
GET /api/leads/cities
Response: { cities: string[] }

// Get available sources
GET /api/leads/sources
Response: { sources: string[] }
```

### Timeout Configuration

- All API requests timeout after 5000ms
- Add retry logic if needed (see `leads-api.ts`)

## Configuration

### Tailwind Colors

Edit `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',    // Blue
        secondary: '#10B981',  // Green
        danger: '#EF4444',     // Red
      },
    },
  },
};
```

### Vite Configuration

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5173,              // Dev server port
    strictPort: true,        // Fail if port in use
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    minify: 'terser',        // JS minification
    target: 'ES2020',
  },
});
```

### Environment Variables

Create `.env.local`:

```env
VITE_API_BASE=/api
VITE_API_TIMEOUT=5000
```

Access in code:

```typescript
const apiBase = import.meta.env.VITE_API_BASE;
```

## Performance Optimization

### Current Metrics

- Page Load: <2 seconds (first paint)
- Filter Response: <500ms
- Bundle Size: <200KB (gzipped)

### Optimization Techniques

1. **Lazy Loading**: Components split by route (when routing added)
2. **Image Optimization**: Icons from Lucide (lightweight)
3. **CSS Purging**: TailwindCSS JIT removes unused styles
4. **Minification**: Terser for production builds
5. **API Caching**: Axios can be configured with cache interceptors
6. **Pagination**: 25 leads per page limits initial data transfer

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### "Cannot find module" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Port 5173 already in use"

```bash
# Change port in vite.config.ts or kill existing process
lsof -i :5173
kill -9 <PID>
```

### Styles not updating

```bash
# Clear TailwindCSS cache
rm -rf .next  # if using Next.js
npm run dev   # rebuild
```

### API requests failing

1. Verify Module 2 backend is running: `http://localhost:3001`
2. Check CORS configuration in backend
3. Verify API endpoints match in `leads-api.ts`
4. Check browser console for error details

## Deployment

### Build for Production

```bash
npm run build
# Output: dist/ folder
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
RUN npm install -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist"]
```

## Acceptance Criteria Status

- ✅ AC1: Dashboard layout with sidebar and main content area
- ✅ AC2: Responsive table displaying leads with 7 columns
- ✅ AC3: Filter bar with city/source/validity dropdowns
- ✅ AC4: Lead detail modal with 15 fields and copy-to-clipboard
- ✅ AC5: Integration with Module 2 PostgreSQL database
- ✅ AC6: Performance targets (<2s page load, <500ms filters)
- ✅ AC7: Comprehensive test suite (51 tests, >80% coverage)

## Next Steps

### Phase 2 Features (not in MVP)

1. **Routing**: Add React Router for multi-page navigation
2. **Authentication**: JWT-based login with secure tokens
3. **Export**: CSV/PDF export of lead data
4. **Scheduling**: Bulk WhatsApp message scheduling
5. **Analytics**: Charts and metrics dashboard
6. **Real-time**: WebSocket updates for new leads

## Support

For issues or questions:

1. Check this README and troubleshooting section
2. Review test files for usage examples
3. Check Vite and React documentation
4. Open an issue in the project repository

## License

MIT

---

**Built with ❤️ for FindVan OSINT + SDR System**

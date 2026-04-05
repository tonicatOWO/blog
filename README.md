# Blog Project

## Project Structure

```
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── uno.config.ts
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## CSS Architecture

- **Framework**: UnoCSS with Wind, Attributify, Icons, and Typography presets
- **Configuration**: See `uno.config.ts` for theme and shortcuts
- **Global CSS**: `src/styles/global.css` for font declarations

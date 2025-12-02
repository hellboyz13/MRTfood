# Singapore MRT Food Finder

An interactive web application to find food places near Singapore MRT stations.

## Features

- **Official MRT Map**: Uses the actual Singapore MRT/LRT system map SVG from Wikimedia Commons
- **Clickable Stations**: Click any station to see food recommendations
- **Red Selection**: Selected station turns red for clear visual feedback
- **Scrolling Ad Banner**: MapleStory-style megaphone scrolling text at the top
- **Food Side Panel**: 350px panel on the right showing curated food places
- **Mobile Responsive**: Bottom drawer on mobile devices
- **Zoom & Pan**: Smooth zoom and pan controls for easy navigation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map Interaction**: react-zoom-pan-pinch
- **Deployment**: Ready for Vercel
- **Backend**: Designed for Supabase integration (mock data for now)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **View the Map**: The official Singapore MRT map loads automatically
2. **Navigate**:
   - Use the zoom controls (+, -, Reset) on the bottom right
   - Click and drag to pan around the map
   - Double-click to zoom in
   - Scroll to zoom in/out
3. **Select a Station**: Click on any station circle - it turns red when selected
4. **View Food Places**: A panel appears on the right (or bottom on mobile) with food recommendations

## Project Structure

```
MRTfood/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage with state management
│   └── globals.css         # Global styles + animations
├── components/
│   ├── MRTMap.tsx          # Interactive SVG map component
│   ├── FoodPanel.tsx       # Side panel / mobile drawer
│   ├── FoodCard.tsx        # Individual food place card
│   └── AdBanner.tsx        # Scrolling advertisement banner
├── data/
│   └── mock-data.ts        # Mock food data (replace with Supabase)
├── types/
│   └── index.ts            # TypeScript interfaces
├── public/
│   └── mrt-map.svg         # Official MRT map from Wikimedia
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Mock Data Stations

Food data is currently available for:
- **Newton** - Famous Newton Food Centre and hawker stalls
- **Orchard** - Din Tai Fung, PS.Cafe, TWG Tea, and more
- **Chinatown** - Tian Tian Chicken Rice, Hawker Chan, and local favorites

## Next Steps - Supabase Integration

To connect with Supabase for real food data:

1. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

2. Create a Supabase project at [supabase.com](https://supabase.com)

3. Set up environment variables:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Create tables in Supabase:
   - `food_places` - Restaurant/food place data with `station_id` field

5. Update `data/mock-data.ts` to fetch from Supabase instead

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

3. Vercel will automatically detect Next.js and deploy your app

## License

MIT

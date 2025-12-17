# Performance Optimization Plan for 5000+ Users

## ✅ COMPLETED

### 1. Database Indexes
- Created migration file: `supabase/migrations/20251217_performance_indexes.sql`
- Indexes to apply via Supabase SQL Editor:
  - `idx_food_listings_station_id` - Speed up station queries
  - `idx_food_listings_name` - Speed up name searches
  - `idx_food_listings_tags` - Speed up tag filtering (GIN index)
  - `idx_food_listings_rating` - Speed up sorting by rating
  - `idx_food_listings_station_active` - Composite index
  - `idx_mall_outlets_mall_id`, `idx_mall_outlets_name`
  - `idx_malls_station_id`, `idx_malls_name`
  - `idx_stations_name`
  - `idx_listing_sources_listing_id`, `idx_listing_sources_source_id`

### 2. Empty Station Redirect System
- ✅ 37 empty stations with smart redirect
- ✅ Shows nearby station with mall preview
- ✅ LRT connection indicator
- ✅ Clean redirect card UI
- ✅ Mall names on separate lines

### 3. Fixed Issues
- ✅ Clark Quay/Fort Canning click overlap (reduced hit area for close stations)
- ✅ Flash of empty state on load (added loading check)
- ✅ Mall station mismatches (fixed 5 malls)
- ✅ HillV2 now showing at Hillview station
- ✅ All LRT stations redirect to main station only

## 🚧 TODO - PRIORITY ORDER

### ✅ Step 2: Pagination (COMPLETED)
**Search Results (components/SearchResultsPanel.tsx)**
- ✅ Added `useState` for page number and items per page (20)
- ✅ Shows "Showing 20 of 156 stations"
- ✅ Added "Load More" button at bottom
- ✅ Updates to `.slice(0, page * 20)`
- ✅ Resets pagination when search query changes

**Station Listings (components/FoodPanelV2.tsx)**
- ✅ Added pagination state (20 per page)
- ✅ Shows "Showing 20 of 85 listings"
- ✅ Added "Load More" button
- ✅ Applied to both Popular and Curated tabs
- ✅ Resets pagination when station or mode changes

**Mall Outlets (components/OutletList.tsx)**
- ✅ Added pagination (20 per page)
- ✅ Shows "Showing 20 of 45 outlets"
- ✅ Added "Load More" button

### ✅ Step 3: Search Optimization (COMPLETED)
**Debouncing (components/SearchBar.tsx)**
- ✅ Implemented 300ms debounce using useEffect + setTimeout
- ✅ Auto-searches as user types (after 300ms delay)
- ✅ Clears debounce timer on query change
- ✅ Immediate search on Enter/submit button

**Minimum Characters**
- ✅ Shows "Type at least 2 characters" hint below search box
- ✅ Disables search button until 2 chars entered
- ✅ Only triggers search when >= 2 characters

**Result Counts**
- ✅ Shows "Showing X of Y stations" in search results
- ✅ Shows "Showing X of Y listings" in station panel
- ✅ Shows "No food found for 'xyz'" with try different term message

### Step 4: Lazy Loading Images
**Create LazyImage Component**
```typescript
// components/LazyImage.tsx
- Use Intersection Observer API
- Show gray placeholder skeleton
- Fade in on load
- Fallback to placeholder if broken
```

**Update Components**
- [ ] FoodListingCardV2
- [ ] RestaurantGridCard
- [ ] OutletCard
- [ ] MallCard

### Step 5: Skeleton Loading States
**Create Skeleton Components**
- [ ] `SkeletonCard` - for food listings
- [ ] `SkeletonOutlet` - for mall outlets
- [ ] `SkeletonSearch` - for search results

**Update Loading States**
- [ ] Replace simple spinners with skeleton cards
- [ ] Smooth fade transition when data loads

### Step 6: Error Handling
**Search Errors**
- [ ] Try/catch around search API calls
- [ ] Show "Something went wrong" with retry button
- [ ] Handle network timeouts

**Image Fallbacks**
- [ ] Placeholder image for broken URLs
- [ ] Generic food icon for missing photos

**Empty States**
- [ ] Better empty search messaging
- [ ] Suggestions for common searches

### Step 7: Mobile Performance
- [ ] Limit initial render to 20 items
- [ ] Virtual scrolling for long lists (react-window)
- [ ] Reduce animation complexity on mobile
- [ ] Compress images for mobile

## 📊 Expected Performance Improvements

### Before Optimization
- Search: ~500-1000ms for 1000+ listings
- Initial load: All data at once (heavy)
- Images: All load immediately (slow)
- No indexes: Full table scans

### After Optimization
- Search: ~50-100ms with indexes
- Initial load: Only 20 items (fast)
- Images: Lazy load as needed
- Database: Indexed queries (10x faster)

## 🎯 Success Metrics
- Page load < 2 seconds
- Search results < 500ms
- Smooth scrolling (60fps)
- No flash of empty content
- Handles 5000+ concurrent users

## 🔧 Testing Plan
1. Test with 100+ listings per station
2. Test search with 1000+ results
3. Test slow 3G connection
4. Test with broken image URLs
5. Load test with locust/k6

## 📝 Notes
- Apply database indexes via Supabase Dashboard > SQL Editor
- Use the migration file: `supabase/migrations/20251217_performance_indexes.sql`
- Test pagination before implementing lazy loading
- Keep mobile animations lightweight

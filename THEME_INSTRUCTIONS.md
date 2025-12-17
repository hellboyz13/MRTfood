# MRT Foodie Theme Update Instructions

## Overview
Apply a **mustard yellow (#E8B931) and dark (#1a1a1a)** theme to the MRT Foodie website UI elements. This creates a fun, playful look using the Fredoka font.

**DO NOT CHANGE:**
- Background color/gradient
- SVG map elements
- Map station markers

---

## 1. Add Fredoka Font

In your global CSS or layout file, add:
```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap');
```

---

## 2. Theme Color Variables

Add these CSS variables to your global styles:
```css
:root {
  --mustard: #E8B931;
  --mustard-light: #F5D251;
  --mustard-dark: #D4A020;
  --dark: #1a1a1a;
  --dark-hover: #2a2a2a;
}
```

---

## 3. Control Buttons Styling (Filter, Search, Location, Refresh)

Apply this style to all floating control buttons:

```css
.control-button {
  background-color: var(--mustard);
  color: var(--dark);
  border: 3px solid var(--dark);
  border-radius: 14px;
  padding: 12px;
  font-family: 'Fredoka', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-button:hover {
  transform: scale(1.05);
  background-color: var(--mustard-light);
}

.control-button:active {
  transform: scale(0.98);
}

/* Icon inside button */
.control-button svg {
  width: 22px;
  height: 22px;
  stroke-width: 2.5;
}
```

**Tailwind equivalent:**
```jsx
className="bg-[#E8B931] text-[#1a1a1a] border-[3px] border-[#1a1a1a] rounded-[14px] p-3 font-semibold cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-[#F5D251] active:scale-98 shadow-lg"
```

---

## 4. Information Page / Modal Styling

```css
.info-modal {
  background-color: var(--mustard);
  border: 4px solid var(--dark);
  border-radius: 24px;
  padding: 28px 24px;
  font-family: 'Fredoka', sans-serif;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.info-modal h2 {
  font-size: 26px;
  font-weight: 700;
  color: var(--dark);
  text-align: center;
  margin-bottom: 8px;
}

.info-modal p {
  font-size: 14px;
  color: #4a4a4a;
  font-weight: 500;
}

/* Decorative background circles (optional) */
.info-modal::before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--mustard-light);
  opacity: 0.6;
}

.info-modal::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--mustard-dark);
  opacity: 0.4;
}
```

---

## 5. Info Row Items (for instruction lists)

```css
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.info-row svg {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: var(--dark);
}

.info-row span {
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
  line-height: 1.4;
}
```

---

## 6. Dark Badge/Tag Section (like curated sources)

```css
.dark-badge {
  background-color: var(--dark);
  border-radius: 12px;
  padding: 12px 16px;
}

.dark-badge-title {
  font-size: 12px;
  color: var(--mustard);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.tag {
  display: inline-block;
  background: var(--mustard);
  color: var(--dark);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin: 3px;
}
```

---

## 7. Primary CTA Button

```css
.cta-button {
  width: 100%;
  padding: 14px 24px;
  background-color: var(--dark);
  color: var(--mustard);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Fredoka', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cta-button:hover {
  transform: scale(1.02);
  background-color: var(--dark-hover);
}
```

---

## 8. Filter Dropdown/Panel

```css
.filter-panel {
  background: var(--mustard);
  border: 3px solid var(--dark);
  border-radius: 16px;
  padding: 16px;
  font-family: 'Fredoka', sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-option:hover {
  background: rgba(255, 255, 255, 0.7);
}

.filter-option.active {
  background: var(--dark);
  color: var(--mustard);
}
```

---

## 9. Search Input

```css
.search-input {
  background: rgba(255, 255, 255, 0.9);
  border: 3px solid var(--dark);
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 14px;
  font-family: 'Fredoka', sans-serif;
  font-weight: 500;
  color: var(--dark);
  width: 100%;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--mustard-dark);
  box-shadow: 0 0 0 3px rgba(232, 185, 49, 0.3);
}

.search-input::placeholder {
  color: #888;
}
```

---

## 10. Add HowToUseCard Component

Create a new file `components/HowToUseCard.jsx` and paste the provided component code. Then import and add it to your main page:

```jsx
import HowToUseCard from '@/components/HowToUseCard';

export default function Home() {
  return (
    <>
      <HowToUseCard />
      {/* ... rest of your app */}
    </>
  );
}
```

---

## Color Reference

| Name | Hex | Usage |
|------|-----|-------|
| Mustard | `#E8B931` | Primary background, accents |
| Mustard Light | `#F5D251` | Hover states, decorative |
| Mustard Dark | `#D4A020` | Decorative circles |
| Dark | `#1a1a1a` | Text, borders, buttons |
| Dark Hover | `#2a2a2a` | Button hover |

---

## Summary Checklist

- [ ] Add Fredoka font import
- [ ] Add CSS variables
- [ ] Style control buttons (filter, search, location, refresh)
- [ ] Style information page/modal
- [ ] Style filter panel/dropdown
- [ ] Style search input
- [ ] Add HowToUseCard component
- [ ] Test on mobile viewport

# 🧪 Weighted Tag Search Test Examples

This document shows comprehensive test examples for the weighted tag search system.

## 📚 How It Works

### Tag Categories

**PRIMARY TAGS (Score: 100)** - KNOWN FOR
- What the brand is **FAMOUS FOR**
- Main identity and core offerings
- Signature menu items
- ✅ **WILL appear in search results**

**SECONDARY TAGS (Score: 50)** - HAS IT
- Available but not famous for it
- Supporting items or generic categories
- Ingredients vs dishes
- ❌ **WILL NOT appear in search results** (excluded to prevent false positives)

**NO MATCH (Score: 0)**
- Not in either primary or secondary tags
- ❌ **WILL NOT appear in search results**

---

## 🍣 GENKI SUSHI Examples

### ✅ Should Match (Primary Tags)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `sushi` | PRIMARY | 100 | ✅ YES | Genki Sushi is KNOWN FOR sushi |
| `sashimi` | PRIMARY | 100 | ✅ YES | Core offering |
| `japanese` | PRIMARY | 100 | ✅ YES | Main cuisine type |
| `conveyor belt` | PRIMARY | 100 | ✅ YES | Signature service style |

### ❌ Should NOT Match (Secondary Tags - Excluded)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `salmon` | SECONDARY | 50 | ❌ NO | They HAVE salmon but not known for "salmon" specifically |
| `rice` | SECONDARY | 50 | ❌ NO | Ingredient, not the main offering |

### ❌ Should NOT Match (Not Tagged)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `seafood` | NONE | 0 | ❌ NO | Not tagged (sushi has seafood but too generic) |

---

## 🍔 MCDONALD'S Examples

### ✅ Should Match (Primary Tags)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `burger` | PRIMARY | 100 | ✅ YES | McDonald's is KNOWN FOR burgers |
| `mcspicy` | PRIMARY | 100 | ✅ YES | Signature menu item |
| `fries` | PRIMARY | 100 | ✅ YES | Famous for fries |
| `mcnuggets` | PRIMARY | 100 | ✅ YES | Signature menu item |
| `breakfast` | PRIMARY | 100 | ✅ YES | Known for breakfast menu |
| `mcmuffin` | PRIMARY | 100 | ✅ YES | Signature breakfast item |

### ❌ Should NOT Match (Secondary Tags - Excluded)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `chicken` | SECONDARY | 50 | ❌ NO | Has chicken but use specific items like "mcnuggets" |
| `western` | SECONDARY | 50 | ❌ NO | Too generic |
| `coffee` | SECONDARY | 50 | ❌ NO | Not what McDonald's is famous for |

---

## 🍗 KFC Examples

### ✅ Should Match (Primary Tags)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `fried chicken` | PRIMARY | 100 | ✅ YES | KFC is KNOWN FOR fried chicken |
| `chicken` | PRIMARY | 100 | ✅ YES | Main offering (unlike McDonald's where it's secondary) |
| `zinger` | PRIMARY | 100 | ✅ YES | Signature menu item |
| `popcorn chicken` | PRIMARY | 100 | ✅ YES | Signature menu item |

### ❌ Should NOT Match (Secondary Tags - Excluded)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `burger` | SECONDARY | 50 | ❌ NO | KFC has burgers but not known for them |
| `fries` | SECONDARY | 50 | ❌ NO | Side dish, not main offering |

---

## 🥟 DIN TAI FUNG Examples

### ✅ Should Match (Primary Tags)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `xiao long bao` | PRIMARY | 100 | ✅ YES | Din Tai Fung is FAMOUS for XLB |
| `soup dumplings` | PRIMARY | 100 | ✅ YES | Same as XLB |
| `dumplings` | PRIMARY | 100 | ✅ YES | Main offering |
| `dim sum` | PRIMARY | 100 | ✅ YES | Core category |
| `taiwanese` | PRIMARY | 100 | ✅ YES | Cuisine type |

### ❌ Should NOT Match (Secondary Tags - Excluded)

| Search Query | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|
| `fried rice` | SECONDARY | 50 | ❌ NO | They have it but not known for it |
| `noodles` | SECONDARY | 50 | ❌ NO | Supporting item |
| `chinese` | SECONDARY | 50 | ❌ NO | Too generic, use "taiwanese" instead |

---

## 🧋 BUBBLE TEA Examples

### KOI

**✅ Should Match (Primary)**
- `bubble tea` → PRIMARY → ✅ Known for bubble tea
- `boba` → PRIMARY → ✅ Same as bubble tea
- `milk tea` → PRIMARY → ✅ Signature offering
- `golden bubble` → PRIMARY → ✅ Signature item

**❌ Should NOT Match (Secondary)**
- `drinks` → SECONDARY → ❌ Too generic
- `beverage` → SECONDARY → ❌ Too generic
- `tea` → SECONDARY → ❌ Use "bubble tea" or "milk tea"

### TIGER SUGAR

**✅ Should Match (Primary)**
- `brown sugar` → PRIMARY → ✅ Tiger Sugar is FAMOUS for brown sugar boba
- `tiger stripes` → PRIMARY → ✅ Signature visual element
- `bubble tea` → PRIMARY → ✅ Main category
- `boba` → PRIMARY → ✅ Main category

**❌ Should NOT Match (Secondary)**
- `drinks` → SECONDARY → ❌ Too generic
- `milk tea` → SECONDARY → ❌ More specific to other brands

---

## 🍲 HOTPOT Examples

### HAIDILAO

**✅ Should Match (Primary)**
- `hotpot` → PRIMARY → ✅ Haidilao is KNOWN FOR hotpot
- `steamboat` → PRIMARY → ✅ Same as hotpot in Singapore
- `mala` → PRIMARY → ✅ Signature soup base
- `soup base` → PRIMARY → ✅ Core offering
- `shabu` → PRIMARY → ✅ Related to hotpot style

**❌ Should NOT Match (Secondary)**
- `chinese` → SECONDARY → ❌ Too generic
- `beef` → SECONDARY → ❌ Ingredient, not what they're known for
- `seafood` → SECONDARY → ❌ Ingredient, not main offering
- `noodles` → SECONDARY → ❌ Add-on item

---

## ☕ LOCAL KOPITIAM Examples

### YA KUN

**✅ Should Match (Primary)**
- `kaya toast` → PRIMARY → ✅ Ya Kun is FAMOUS for kaya toast
- `coffee` → PRIMARY → ✅ Traditional Singapore coffee
- `kopi` → PRIMARY → ✅ Local coffee style
- `soft boiled eggs` → PRIMARY → ✅ Signature item
- `breakfast` → PRIMARY → ✅ Known for breakfast
- `traditional` → PRIMARY → ✅ Traditional kopitiam

**❌ Should NOT Match (Secondary)**
- `local` → SECONDARY → ❌ Too generic
- `singaporean` → SECONDARY → ❌ Too generic

### OLD CHANG KEE

**✅ Should Match (Primary)**
- `curry puff` → PRIMARY → ✅ Old Chang Kee signature item
- `fried snacks` → PRIMARY → ✅ Main category
- `sotong` → PRIMARY → ✅ Popular item (sotong head)
- `chicken wing` → PRIMARY → ✅ Popular fried item

**❌ Should NOT Match (Secondary)**
- `local` → SECONDARY → ❌ Too generic
- `singaporean` → SECONDARY → ❌ Too generic
- `fast food` → SECONDARY → ❌ Category overlap

---

## 🍜 Comparison: "Chicken" Search

This demonstrates how the same search term can be PRIMARY for one brand but SECONDARY for another:

| Brand | Query: `chicken` | Tag Type | Score | Appears? | Reason |
|---|---|---|---|---|---|
| **KFC** | chicken | PRIMARY | 100 | ✅ YES | KFC is KNOWN FOR chicken |
| **Jollibee** | chicken | PRIMARY | 100 | ✅ YES | Known for chickenjoy |
| **4Fingers** | chicken | PRIMARY | 100 | ✅ YES | Known for crispy chicken |
| **McDonald's** | chicken | SECONDARY | 50 | ❌ NO | Has chicken but use "mcnuggets" instead |

---

## 🎯 Key Takeaways

1. **Only PRIMARY tags (score 100) appear in search**
   - SECONDARY tags (score 50) are completely excluded
   - This prevents false positives

2. **Specific > Generic**
   - "mcspicy" (PRIMARY) > "chicken" (SECONDARY) for McDonald's
   - "xiao long bao" (PRIMARY) > "chinese" (SECONDARY) for Din Tai Fung
   - "kaya toast" (PRIMARY) > "singaporean" (SECONDARY) for Ya Kun

3. **Context Matters**
   - "chicken" is PRIMARY for KFC but SECONDARY for McDonald's
   - "burger" is PRIMARY for McDonald's but SECONDARY for KFC

4. **Ingredients vs Dishes**
   - "salmon" is SECONDARY (ingredient) for Genki Sushi
   - "sushi" is PRIMARY (dish) for Genki Sushi
   - "beef" is SECONDARY (ingredient) for Haidilao
   - "hotpot" is PRIMARY (dish) for Haidilao

---

## 🧪 Manual Testing Guide

To test the weighted tag system manually:

1. **Open the app** at http://localhost:3000
2. **Click on any station** on the MRT map
3. **Switch to "Popular" tab** in the food panel
4. **Use the search bar** at the bottom
5. **Try these searches:**

### Expected Results:

**Search: "sushi"**
- ✅ Should show: Genki Sushi, Sushi Express
- ❌ Should NOT show: McDonald's, KFC, etc.

**Search: "chicken"**
- ✅ Should show: KFC, Jollibee, 4Fingers
- ❌ Should NOT show: McDonald's (has chicken but use "mcnuggets")

**Search: "burger"**
- ✅ Should show: McDonald's, Burger King
- ❌ Should NOT show: KFC (has burgers but not known for them)

**Search: "bubble tea"**
- ✅ Should show: KOI, LiHo, Gong Cha, Tiger Sugar, Chicha San Chen, The Alley, Each A Cup
- ❌ Should NOT show: Ya Kun, McDonald's, etc.

**Search: "xiao long bao"**
- ✅ Should show: Din Tai Fung
- ❌ Should NOT show: Crystal Jade (unless also tagged)

**Search: "hotpot"**
- ✅ Should show: Haidilao, Beauty in the Pot, Suki-Ya
- ❌ Should NOT show: Din Tai Fung, KFC, etc.

**Search: "kaya toast"**
- ✅ Should show: Ya Kun, Toast Box
- ❌ Should NOT show: McDonald's, Subway, etc.

---

## 🔧 Implementation Details

The weighted tag system is implemented in:
- **[lib/tag-weights.ts](../lib/tag-weights.ts)** - Tag configuration
- **[lib/api.ts](../lib/api.ts)** - Search logic using tags
- **[components/SearchResultsPanel.tsx](../components/SearchResultsPanel.tsx)** - Display search results

Search logic (from `lib/api.ts`):
```typescript
// Only match if primary tags (score 100) are found
// Secondary tags (score 50) are excluded to avoid false positives
const matchScore = calculateTagMatchScore(searchQuery, tagWeights);
return matchScore === 100;
```

# Design System Inspired by Dasher

## 1. Visual Theme & Atmosphere

Dasher is a modern, professional e-commerce admin dashboard that prioritizes clarity, efficiency, and data visualization. The design balances a clean, minimalist aesthetic with purposeful use of color to highlight critical information and guide user actions. The interface employs a calm, neutral foundation with strategic bursts of semantic color (green for success, amber for warnings, red for errors) to communicate status at a glance. Soft, rounded elements and generous whitespace create an approachable, contemporary feel that reduces cognitive load while maintaining visual hierarchy. The typography is sharp and legible, supporting both dense data tables and prominent call-to-action messaging.

**Key Characteristics**

- Clean, minimal aesthetic with strong focus on data clarity
- Semantic color system for instant status recognition
- Rounded, modern component styling with consistent elevation
- Generous whitespace and breathing room between sections
- Professional yet approachable visual language
- Strong emphasis on typography hierarchy and readability
- Muted neutral palette with vibrant accent highlights

## 2. Color Palette & Roles

### Primary
- **Primary Brand** (`#00A76F`): Main call-to-action buttons, links, and primary interactions. Conveys trust and progress in e-commerce contexts.
- **Primary Dark** (`#007867`): Secondary primary usage; darker variant for hover and active states.

### Accent Colors
- **Cyan** (`#00B8D9`): Charts, secondary data visualization, and light UI accents.
- **Orange** (`#FF5630`): Tertiary accent; used sparingly for attention-grabbing secondary actions.

### Interactive
- **Link Primary** (`#00A76F`): Hyperlink text and interactive elements.
- **Link Hover** (`#007867`): Hover state for links and interactive navigation items.

### Neutral Scale
- **Text Primary** (`#1C252E`): Main heading and body text; primary content readability.
- **Text Secondary** (`#637381`): Secondary text, metadata, labels, and disabled states.
- **Text Tertiary** (`#454F5B`): Tertiary information, hints, and subtle UI text.
- **Text Disabled** (`#C4CDD5`): Disabled buttons, form inputs, and inactive UI elements.

### Surface & Borders
- **Background** (`#FFFFFF`): Primary surface for cards, modals, and content areas.
- **Background Light** (`#F9FAFB`): Secondary background for sections, sidebar, and subtle differentiation.
- **Surface** (`#F4F6F8`): Tertiary background for hover states and subtle container fills.
- **Border Subtle** (`#DFE3E8`): Light borders and dividers between elements.
- **Border Strong** (`#C4CDD5`): More prominent borders and outlines.

### Semantic / Status
- **Success** (`#22C55E`): Confirmation, completed states, and positive actions.
- **Warning** (`#FFAB00`): Pending, caution, and attention-required states.
- **Error** (`#B71D18`): Errors, cancellations, and negative states.

### Shadow Colors
- **Shadow Overlay** (`rgba(145, 158, 171, 0.2)`): Used for soft, subtle shadows on cards and elevated surfaces.
- **Shadow Deep** (`rgba(145, 158, 171, 0.12)`): Deeper shadow for elevated cards and modals.

## 3. Typography Rules

### Font Family
**Primary:** Public Sans (https://fonts.googleapis.com/), fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

**Secondary:** Public Sans (same stack as primary; system supports single font family)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display | Public Sans | 32px | 700 | 40px | 0px | Large dashboard headings and section titles |
| H1 | Public Sans | 24.5px | 600 | 30.625px | 0px | Page titles and major section headings |
| H2 | Public Sans | 20px | 600 | 25px | 0px | Secondary headings and card titles |
| H4 | Public Sans | 17.5px | 600 | 21.875px | 0px | Tertiary headings and subsection titles |
| H5 | Public Sans | 14px | 600 | 17.5px | 0px | Small headings, form labels, badges |
| Body | Public Sans | 12px | 500 | 18.84px | 0px | Standard body text, table content, descriptions |
| Body Large | Public Sans | 14px | 500 | 21.98px | 0px | Body text for emphasis, form fields, links |
| Span / Metric | Public Sans | 21px | 700 | 32.97px | 0px | Dashboard KPI values, large numbers |
| Button | Public Sans | 14px | 400 | 21.98px | 0px | Button labels and interactive text |
| Caption | Public Sans | 12px | 700 | 18.852px | 0px | Small text, timestamps, metadata |
| Code | Public Sans | 12px | 500 | 18px | 0px | Code snippets and monospace content |

### Principles
- **Hierarchy through weight:** Use weight 700 for display/metrics, 600 for headings, 500 for body and emphasis, 400 for buttons to create clear visual distinction.
- **Line height consistency:** Maintain 1.25x to 1.5x multipliers for readability across sizes.
- **Single font family:** Public Sans supports all use cases; no secondary font required.
- **Size discipline:** Stick to defined breakpoints (12px, 14px, 17.5px, 20px, 24.5px, 32px) to maintain visual rhythm.
- **Color pairing:** Pair weight 600 headings with `#1C252E` text for maximum contrast; body text with `#637381` for secondary information.

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#00A76F`
- Text Color: `#FFFFFF`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `10px 16px`
- Border Radius: `8px`
- Border: `none`
- Height: `40px`
- Line Height: `16.8px`
- Box Shadow: `none`
- Hover: Background `#007867`
- Active: Background `#007867`, Box Shadow `rgba(145, 158, 171, 0.16) 0px 8px 16px 0px`
- Disabled: Background `#C4CDD5`, Text Color `#FFFFFF`, Cursor `not-allowed`

**Secondary Button**
- Background: `#FFFFFF`
- Text Color: `#637381`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `10px 16px`
- Border Radius: `8px`
- Border: `1px solid #DFE3E8`
- Height: `40px`
- Line Height: `16.8px`
- Box Shadow: `none`
- Hover: Background `#F4F6F8`, Border Color `#C4CDD5`
- Active: Background `#F9FAFB`, Border Color `#C4CDD5`
- Disabled: Background `#FFFFFF`, Text Color `#C4CDD5`, Border Color `#DFE3E8`, Cursor `not-allowed`

**Ghost Button**
- Background: `transparent`
- Text Color: `#637381`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `8px 12px`
- Border Radius: `8px`
- Border: `none`
- Height: `auto`
- Line Height: `16.8px`
- Box Shadow: `none`
- Hover: Background `#F9FAFB`, Text Color `#1C252E`
- Active: Background `#F4F6F8`, Text Color `#1C252E`
- Disabled: Text Color `#C4CDD5`, Cursor `not-allowed`

**Success Button (Accent)**
- Background: `#C8FAD6`
- Text Color: `#007867`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `10px 16px`
- Border Radius: `8px`
- Border: `none`
- Height: `40px`
- Line Height: `16.8px`
- Box Shadow: `none`
- Hover: Background `#A8F5C8`
- Active: Background `#22C55E`, Text Color `#FFFFFF`
- Disabled: Background `#C4CDD5`, Text Color `#FFFFFF`, Cursor `not-allowed`

### Cards & Containers

**Standard Card**
- Background: `#FFFFFF`
- Text Color: `#1C252E`
- Padding: `20px`
- Border Radius: `16px`
- Border: `none`
- Box Shadow: `rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px`
- Min Height: `auto`
- Hover: Box Shadow `rgba(145, 158, 171, 0.16) 0px 8px 16px 0px`

**Metric Card**
- Background: `#FFFFFF`
- Text Color: `#1C252E`
- Padding: `24px`
- Border Radius: `16px`
- Border: `none`
- Box Shadow: `rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px`
- Display: Flex column
- Align Items: Flex start
- Heading Font Size: `17.5px`, Weight `600`, Color `#637381`
- Value Font Size: `21px`, Weight `700`, Color `#1C252E`
- Delta Font Size: `12px`, Weight `500`, Color `#22C55E` (positive) or `#FF5630` (negative)

**Section Container**
- Background: `#F9FAFB`
- Padding: `32px`
- Border Radius: `16px`
- Border: `none`
- Box Shadow: `none`

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF`
- Text Color: `#1C252E`
- Placeholder Color: `#C4CDD5`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `8px 12px`
- Border Radius: `8px`
- Border: `1px solid #DFE3E8`
- Height: `auto`
- Line Height: `21.98px`
- Width: `100%`
- Focus: Border Color `#00A76F`, Box Shadow `0px 0px 0px 3px rgba(0, 167, 111, 0.12)`
- Disabled: Background `#F9FAFB`, Border Color `#C4CDD5`, Text Color `#C4CDD5`, Cursor `not-allowed`

**Form Label**
- Font Size: `14px`
- Font Weight: `600`
- Color: `#1C252E`
- Margin Bottom: `8px`

**Form Hint Text**
- Font Size: `12px`
- Font Weight: `500`
- Color: `#637381`
- Margin Top: `4px`

### Navigation

**Sidebar Nav Item (Default)**
- Background: `transparent`
- Text Color: `#637381`
- Font Size: `14px`
- Font Weight: `500`
- Padding: `12px 16px`
- Border Radius: `8px`
- Border: `none`
- Height: `auto`
- Line Height: `21.98px`
- Hover: Background `#F9FAFB`, Text Color `#1C252E`
- Active: Background `#C8FAD6`, Text Color `#007867`, Font Weight `600`

**Sidebar Nav Item (Selected)**
- Background: `#C8FAD6`
- Text Color: `#007867`
- Font Size: `14px`
- Font Weight: `600`
- Padding: `12px 16px`
- Border Radius: `8px`
- Border: `none`
- Height: `40px`
- Line Height: `16.8px`

**Breadcrumb**
- Font Size: `12px`
- Font Weight: `500`
- Color: `#637381`
- Separator: `/` Color `#DFE3E8`
- Active Item Color: `#1C252E`
- Link Color: `#00A76F`, Hover `#007867`

### Badges

**Badge Default**
- Background: `#F9FAFB`
- Text Color: `#637381`
- Font Size: `12px`
- Font Weight: `700`
- Padding: `4px 8px`
- Border Radius: `4px`
- Border: `none`
- Line Height: `16.8px`

**Badge Success**
- Background: `#C8FAD6`
- Text Color: `#007867`
- Font Size: `12px`
- Font Weight: `700`
- Padding: `6px 12px`
- Border Radius: `800px`
- Border: `none`
- Line Height: `16.8px`

**Badge Warning**
- Background: `#FFF7CD`
- Text Color: `#B76E00`
- Font Size: `12px`
- Font Weight: `700`
- Padding: `6px 12px`
- Border Radius: `800px`
- Border: `none`
- Line Height: `16.8px`

**Badge Error**
- Background: `#FFE7D9`
- Text Color: `#B71D18`
- Font Size: `12px`
- Font Weight: `700`
- Padding: `6px 12px`
- Border Radius: `800px`
- Border: `none`
- Line Height: `16.8px`

### Tables

**Table Header Cell**
- Background: `#F9FAFB`
- Text Color: `#1C252E`
- Font Size: `12px`
- Font Weight: `600`
- Padding: `12px 16px`
- Border Bottom: `1px solid #DFE3E8`
- Height: `40px`

**Table Body Cell**
- Background: `#FFFFFF`
- Text Color: `#637381`
- Font Size: `12px`
- Font Weight: `500`
- Padding: `12px 16px`
- Border Bottom: `1px solid #DFE3E8`
- Height: `40px`

**Table Row Hover**
- Background: `#F9FAFB`

### Avatars

**Avatar**
- Background: `#00A76F`
- Text Color: `#FFFFFF`
- Font Size: `14px`
- Font Weight: `700`
- Border Radius: `50%`
- Width: `40px`
- Height: `40px`
- Display: Flex, Align Items Center, Justify Content Center

## 5. Layout Principles

### Spacing System
Base unit: `8px`

Spacing scale:
- `4px`: Micro spacing, gap between inline elements
- `8px`: Padding for compact components, small gaps
- `12px`: Padding for form inputs and badges
- `16px`: Standard padding for buttons, navigation items
- `20px`: Card internal padding, section padding
- `24px`: Large card padding, metric card padding
- `28px`: Margin between major sections
- `32px`: Padding for container sections, large spacing
- `40px`: Padding for hero sections and full-width areas
- `80px`: Extra-large spacing for section separation

Usage context:
- Micro gaps: Icon-text pairs, inline lists
- Small padding: Form elements, compact cards
- Standard padding: Buttons, navigation, inline spacing
- Large padding: Cards, containers, section interiors
- Section margins: Between major content blocks

### Grid & Container
- **Max Width:** `1280px` for main content container
- **Column Strategy:** 12-column grid system; adapts to 6 columns on tablet, 1 column on mobile
- **Sidebar Width:** `280px` (desktop), collapses to 80px or drawer on mobile
- **Section Pattern:** Full-width section containers with max-width inner containers for content
- **Gutters:** `16px` horizontal gutter between columns on desktop, `12px` on tablet, `8px` on mobile

### Whitespace Philosophy
Generous, purposeful whitespace creates breathing room and visual clarity. Every element is surrounded by sufficient space to reduce cognitive load. Cards are isolated with consistent padding and elevation. Section breaks use vertical spacing (28px minimum) to signal new content blocks. The design avoids visual crowding by preferring larger padding over smaller gaps.

### Border Radius Scale
- `4px`: Badges, small UI elements, tight radius
- `8px`: Buttons, form inputs, tight rounding
- `16px`: Cards, containers, standard rounding
- `16px 16px 0px 0px`: Card top corners (used for modal headers)
- `50%`: Avatars, circular components
- `800px`: Pill-shaped badges and long buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (No Elevation) | `none` | Flat surfaces, text overlays, inline elements |
| Base (Subtle Shadow) | `rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px` | Standard cards, containers, default UI elements |
| Raised (Medium Shadow) | `rgba(145, 158, 171, 0.16) 0px 8px 16px 0px` | Hover states, interactive elements, modals |
| Floating (Deep Shadow) | `rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px` with blur 24px | Dropdowns, tooltips, floating elements |

Shadow philosophy: The design uses soft, subtle shadows that add depth without harshness. Shadows employ a muted gray (based on `#919EAB` at reduced opacity) to maintain a calm, professional aesthetic. Double-layered shadows (small + large blur) create natural depth. Elevation increases with interaction; hover states and active components lift slightly. Shadows never employ pure black, maintaining the approachable visual language.

## 7. Do's and Don'ts

### Do
- Use `#00A76F` for all primary call-to-action buttons; ensure they stand out against backgrounds.
- Apply semantic colors (`#22C55E`, `#FFAB00`, `#B71D18`) consistently for status indicators; users depend on color associations.
- Maintain consistent `16px` border radius on cards and containers to preserve the modern, rounded aesthetic.
- Pair heavy weights (700, 600) with `#1C252E` for critical headings; ensure maximum contrast and readability.
- Use `#637381` for secondary text (labels, metadata) to create visual hierarchy without overwhelming.
- Implement generous padding (`20px` minimum inside cards) to avoid visual cramping and improve scannability.
- Layer multiple spacing units (e.g., `32px` section margins + `20px` card padding) to create intentional hierarchy.
- Apply shadows to cards and elevated surfaces; avoid flat designs that lack depth perception.
- Use `#F9FAFB` backgrounds for sidebar and secondary areas to differentiate from primary content.
- Ensure buttons always include a clear hover state (color shift or shadow change) for affordance.

### Don't
- Do not use colors outside the semantic palette for status indicators; stick to green, amber, and red for consistency.
- Do not reduce padding below `8px` in any interactive element; maintain touch target sizes and readability.
- Do not apply border radius greater than `16px` to cards; keep corners proportionate.
- Do not use text colors with insufficient contrast; always verify WCAG AA compliance against backgrounds.
- Do not mix multiple shadows; apply only one shadow level per element state.
- Do not use `#000000` for text; use `#1C252E` instead for a softer, more professional appearance.
- Do not apply background color and border together on buttons without careful consideration; choose one primary treatment.
- Do not nest cards within cards without clear visual separation; avoid visual confusion through excessive nesting.
- Do not use custom fonts outside Public Sans; maintain typographic consistency.
- Do not compress spacing below `4px`; respect the `8px` base unit for all calculations.

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Key Changes |
|-----------|-------|-------------|
| Mobile | 320px - 639px | Single column, sidebar collapses to drawer, padding reduces to 12px, font sizes decrease slightly |
| Tablet | 640px - 1023px | 2-column layout, sidebar reduces to 80px icon-only mode, grid becomes 6 columns |
| Desktop | 1024px - 1279px | 12-column grid, full sidebar (280px), max-width container (1024px) |
| Large Desktop | 1280px+ | 12-column grid, full sidebar, max-width container (1280px), increased padding |

### Touch Targets
- Minimum interactive element size: `40px × 40px` (buttons, nav items)
- Minimum touch area: `44px × 44px` (ideal for mobile)
- Spacing between touch targets: `8px` minimum (prevents accidental activation)
- Form inputs: `40px` height minimum
- Navigation items: `44px` height on mobile, `40px` on desktop
- Icon buttons: `40px` on desktop, `44px` on mobile

### Collapsing Strategy
- **Sidebar:** Full width (280px) on desktop → icon-only (80px) on tablet → hidden drawer on mobile
- **Grid:** 12 columns on desktop → 6 columns on tablet → 1 column on mobile
- **Typography:** No reduction on size scale, but line-height may decrease slightly to 1.2x on mobile for space efficiency
- **Spacing:** Reduce margins by 25% on tablet (e.g., 32px → 24px), reduce by 50% on mobile (e.g., 32px → 16px)
- **Cards:** Full-width on mobile with adjusted padding (16px), 2-column on tablet, 3-column+ on desktop
- **Navigation:** Horizontal on desktop → vertical stacked on mobile, drawer pattern for sidebar
- **Tables:** Horizontal scroll on mobile or simplified card view (stack key columns vertically)
- **Modals:** Full-width minus 16px margin on mobile, centered max-width (90vw) on tablet, standard width on desktop

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Success Green (`#00A76F`)
- **Primary CTA Hover:** Dark Green (`#007867`)
- **Secondary CTA Background:** White (`#FFFFFF`) with border `#DFE3E8`
- **Heading Text:** Dark Slate (`#1C252E`)
- **Body Text:** Medium Gray (`#637381`)
- **Background:** White (`#FFFFFF`)
- **Secondary Background:** Light Gray (`#F9FAFB`)
- **Success Status:** Bright Green (`#22C55E`)
- **Warning Status:** Amber (`#FFAB00`)
- **Error Status:** Dark Red (`#B71D18`)
- **Border:** Light Gray (`#DFE3E8`)
- **Disabled Text:** Muted Gray (`#C4CDD5`)

### Iteration Guide

1. **Always use Public Sans font at defined sizes only** (12px, 14px, 17.5px, 20px, 24.5px, 32px); no custom sizes unless explicitly required for charts or data labels.

2. **Apply semantic colors immediately upon status determination:** Use `#22C55E` for success, `#FFAB00` for warning, `#B71D18` for error; never substitute with similar colors.

3. **Maintain the 8px spacing base unit** across all margins and padding; multiples of 8 create visual rhythm. Exception: form inputs may use `4px` micro-gaps for icon-text pairs.

4. **Default all cards to 16px border radius** with shadow `rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px`; apply raised shadow on hover.

5. **Button padding rule:** Primary buttons = `10px 16px`, secondary = `10px 16px`, ghost = `8px 12px`; height = `40px` minimum with centered text.

6. **Text color hierarchy:** 
   - Headings/Primary: `#1C252E` (weight 600+)
   - Body/Secondary: `#637381` (weight 500)
   - Tertiary/Metadata: `#454F5B` (weight 500)
   - Disabled: `#C4CDD5` (any weight)

7. **Form input consistency:** `#FFFFFF` background, `#DFE3E8` border, `14px` font, `8px 12px` padding, `8px` border-radius, `21.98px` line-height; add `#00A76F` focus border with soft box-shadow.

8. **Responsive padding collapse:**
   - Desktop: 32px sections, 20px cards
   - Tablet: 24px sections, 16px cards
   - Mobile: 16px sections, 12px cards

9. **Interactive affordance required:** Every button, link, and nav item must have a distinct hover state (color shift, shadow change, or background change); active/selected states use `#C8FAD6` background with `#007867` text.

10. **Shadow application rule:** Standard cards only; no shadows on buttons unless explicitly hover/active state; modals and floating elements receive raised shadow level. Never stack multiple box-shadows.
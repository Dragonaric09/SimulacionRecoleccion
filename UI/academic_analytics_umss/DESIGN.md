---
name: Academic Analytics UMSS
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#43474e'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#466083'
  primary: '#00152d'
  on-primary: '#ffffff'
  primary-container: '#0b2a4a'
  on-primary-container: '#7892b7'
  inverse-primary: '#aec8f0'
  secondary: '#0061a5'
  on-secondary: '#ffffff'
  secondary-container: '#72b4ff'
  on-secondary-container: '#004578'
  tertiary: '#001816'
  on-tertiary: '#ffffff'
  tertiary-container: '#002f2c'
  on-tertiary-container: '#0ea198'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#aec8f0'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#2d486a'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#9fcaff'
  on-secondary-fixed: '#001d37'
  on-secondary-fixed-variant: '#00497e'
  tertiary-fixed: '#80f6eb'
  tertiary-fixed-dim: '#62d9cf'
  on-tertiary-fixed: '#00201e'
  on-tertiary-fixed-variant: '#00504b'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
  titulados-active: '#E3EEF8'
  empleadores-active: '#E1F4F2'
  highlight-amber: '#F2A33A'
  ink-900: '#0F172A'
  ink-600: '#475569'
  border-line: '#CBD5E1'
  surface-white: '#FFFFFF'
  status-success: '#2E9E5B'
  status-warning: '#E0A100'
  status-danger: '#D64545'
  chart-cat-1: '#1F6FB5'
  chart-cat-2: '#14A39A'
  chart-cat-3: '#F2A33A'
  chart-cat-4: '#8E5BD0'
  chart-cat-5: '#E4572E'
  chart-cat-6: '#5C6B7A'
  chart-cat-7: '#7CB342'
  chart-cat-8: '#D9418C'
  likert-1: '#E4572E'
  likert-2: '#F4A98A'
  likert-3: '#F1F5F9'
  likert-4: '#8DB8E0'
  likert-5: '#1F6FB5'
  heat-blue-1: '#EAF2FA'
  heat-blue-2: '#BBD6EE'
  heat-blue-3: '#7DB1DD'
  heat-blue-4: '#3F86C4'
  heat-blue-5: '#1F6FB5'
  heat-blue-6: '#12467A'
typography:
  display-kpi:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-page:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  title-section:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-card:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-default:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  caption-meta:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  caption-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system establishes a focused, sober, and authoritative visual environment crafted for institutional research and academic accreditation in systems engineering. Its design philosophy centers on rigorous statistical transparency, purposeful hierarchy, and cognitive ergonomics suitable for desktop analytics (1366–1440px).

Drawing from Modern Institutional Minimalism and Scandinavian data dashboard conventions, the visual language avoids decorative clutter in favor of high-legibility typographic grids, structured spatial groupings, and deliberate categorical color coding. The system serves academic evaluators, university department chairs, and accreditation commissions (such as ARCUSUR) who must inspect small sample sizes ($N = 5$ to $20$) without being misled by premature percentages or visual artifacts.

Every surface, border, and metric is calibrated to project academic precision, reliability, and objective clarity. Dual-domain identity is maintained through split visual accents: vibrant institutional cobalt blue identifies the Titulados (graduates) domain, while clean teal identifies Empleadores (employers), both grounded against a monolithic navy navigation rail.

## Colors
The color palette uses color as semantic architecture rather than ornamentation. The application canvas operates in high-clarity light mode (`#F1F5F9`) with crisp white card containers (`#FFFFFF`), anchored by an institutional deep navy navigation bar (`#0B2A4A`).

The system implements two distinct structural domain hues:
- **Titulados (Graduates):** `#1F6FB5` with contextual interactive background `#E3EEF8`.
- **Empleadores (Employers):** `#14A39A` with contextual interactive background `#E1F4F2`.

Accent amber (`#F2A33A` / `#E0A100`) is reserved strictly for synthesis insights, key concentration findings, and small-sample methodological alerts ($n < 5$).

For visualization and data representation:
- **Multicategory Palette (Sequential Assignment):** `#1F6FB5`, `#14A39A`, `#F2A33A`, `#8E5BD0`, `#E4572E`, `#5C6B7A`, `#7CB342`, and `#D9418C`.
- **Divergent Likert Heatmaps (1 to 5):** `#E4572E` (1: Muy insuficiente) through `#F4A98A` (2), `#F1F5F9` (3: Aceptable), `#8DB8E0` (4), to `#1F6FB5` (5: Muy suficiente). Numbers must always render centered inside cells.
- **Sequential Blue Frequency Density:** 6-tier progression from `#EAF2FA` up to `#12467A`. When surface luminance passes threshold `#3F86C4`, cell typography flips to white for accessibility compliance.

## Typography
Typography is set in Inter across all levels to maintain structural clarity and neutrality. Because this system processes academic surveys and contingency matrices, tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "cv05" 1`) are globally enforced for all data displays, tables, percentages, sample indicators, and KPI counts.

Scale guidelines:
- **Display KPI (32px / 600):** Anchors summary metric cards, paired with contextual secondary counts ("7 de 14") in body-medium.
- **Headline Page (28px / 600):** Displayed once per screen alongside the active section badge.
- **Title Card (18px / 600):** Used for individual card containers, data charts, and contingency cross-tabulations.
- **Body & Tabular Data (14px):** Standard body copy and analytical rows.
- **Caption Meta (12px / 400):** Dedicated to chart baselines, sample size annotations ("n = 14"), and footnote cautions.

## Layout & Spacing
The layout is optimized specifically for fixed-canvas desktop environments (1366px to 1440px viewports). It follows a deterministic two-region composition:
1. **Navigation Rail:** A fixed 240px wide sidebar pinned to the left edge with persistent navy background (`#0B2A4A`).
2. **Main Workspace:** A fluid, padded workspace occupying the remaining width (`calc(100vw - 240px)`), with a container cap at 1200px max-width centered within the content area.

The spacing rhythm is governed strictly by an 8px modular baseline ($0.5\text{rem} = 8\text{px}$, $1\text{rem} = 16\text{px}$, $1.5\text{rem} = 24\text{px}$). 

Grid rhythm within content panes:
- Screen margins are set to `2rem` (32px).
- Column gutters are set to `1.5rem` (24px) in a 12-column layout.
- KPI cards arrange into 4-column rows (`span-3` each).
- Analysis panes use either symmetrical halves (`span-6` / `span-6`) or an asymmetric layout (`span-8` for charts/heatmaps, `span-4` for insight cards, Chi-square summaries, and text findings).
- Compact filter bars occupy a persistent single horizontal band directly below the page title with internal component spacing of `0.75rem` (12px).

## Elevation & Depth
The system achieves depth through low-contrast outlines and structural layering rather than heavy ambient drop shadows, reflecting academic sobriety and utilitarian clarity.

Hierarchy tiers:
- **Base Canvas:** `#F1F5F9` serving as the grounding surface.
- **Surface Level 1 (Cards, Data Panels, Form Areas):** Solid `#FFFFFF`, bordered with an explicit 1px stroke of `#CBD5E1`. A soft ambient shadow (`0px 1px 3px rgba(15, 23, 42, 0.05)`) separates cards from the canvas without visual weight.
- **Surface Level 2 (Flyouts, Dropdown Menus, Contextual Tooltips):** Solid `#FFFFFF`, 1px border `#CBD5E1`, with elevation shadow `0px 4px 12px rgba(15, 23, 42, 0.08)`.
- **Modals ("¿Cómo leer esto?" and Scenario Dialogs):** Centered `#FFFFFF` surface with `0px 12px 28px rgba(11, 42, 74, 0.16)` overlaying a tinted backdrop blur (`rgba(11, 42, 74, 0.4)`).
- **Interactive Hover:** Cards and interactive elements avoid vertical displacement. Hover states are communicated through border transition (`#CBD5E1` $\to$ `#94A3B8` or the respective section color) and subtle background shading.

## Shapes
The design adopts a controlled 8px (`0.5rem`) geometric corner radius across cards, form inputs, buttons, and visual containers. 

Corner radius specifications:
- **Card containers, tables, charts, and modal frames:** 8px (`0.5rem`).
- **Inner elements (buttons, inputs, select fields, alert callouts):** 6px to 8px.
- **Section domain badges and count pills:** Pill-radius 9999px for categorical metadata tags, preserving distinction between interactive buttons and static labels.
- **Heatmap cells:** 4px radius with 2px interior gutter spacing to preserve matrix alignment while retaining micro-definition.

## Components

### KPI Metric Cards
- **Structure:** Surface white, 1px border `#CBD5E1`, 8px radius, padding `1.25rem`.
- **Content:** Header label in `caption-bold` (`#475569`, uppercase, letter-spacing 0.04em). Main metric in `display-kpi` (`#0F172A`). Below the primary metric, always show the explicit absolute count and denominator (e.g., "7 de 14 respuestas · 50%") in `body-medium`. Include a bottom or side subtext showing baseline context (`n = 14`).

### Section Chips & Identifiers
- Placed adjacent to screen titles and table views.
- **Titulados:** Height 24px, pill-radius, text `#1F6FB5`, background `#E3EEF8`, font size 12px, weight 600.
- **Empleadores:** Height 24px, pill-radius, text `#14A39A`, background `#E1F4F2`, font size 12px, weight 600.

### Filter Toolbar & Response Counter
- Fixed single-row bar directly below page headers.
- Contains inline label, segmented range sliders (for graduation year), dropdown selectors (employment status, sector, org size), and a divider.
- Right-aligned counter pill: `#0F172A` text on `#E2E8F0` pill displaying `"Mostrando 11 de 14 respuestas"`.
- A text button `"Limpiar filtros"` activates only when active filters deviate from default.

### Small Sample Alert Banners ($N < 5$ & Chi-Square Warning)
- Background `#FEF3C7` (light amber), 1px solid border `#F2A33A`, 8px radius, padding `0.875rem 1rem`.
- Left-aligned warning triangle icon in `#E0A100`.
- Text in `body-default` (`#78350F`): *"Muestra reducida: X de Y celdas presentan frecuencia esperada menor a 5. El resultado de la prueba Chi-cuadrada es exclusivamente orientativo."*

### Analytical Data Tables
- Outer frame with 1px border `#CBD5E1` and 8px border radius.
- Table headers: Background `#F8FAFC`, bottom border 1px solid `#CBD5E1`, text in `caption-bold` (`#475569`).
- Data rows: Minimum height 40px, cell padding `8px 16px`, subtle border bottom 1px `#F1F5F9`. Alternating row hover: `#F8FAFC`.
- All numerical and percentage columns must be right-aligned and render with `Inter` tabular figures.

### Contingency Heatmap Grids
- Clean matrix layout where rows correspond to independent variables and columns to dependent variables.
- Cells include 4px radius and 2px separation gutters.
- Numbers always render centered inside cells. Cell text switches to pure white (`#FFFFFF`) when background shade is `#3F86C4` or darker; otherwise uses `#0F172A`.

### Modal "¿Cómo leer esto?"
- Top right of every chart card contains a small text button or icon button `"¿Cómo leer esto?"` with a question mark icon (`#475569`).
- Opens a concise overlay popover with a 2-3 sentence guide explaining the statistical interpretation (e.g., how to interpret the Chi-square p-value or the Likert gap score).

### Action Controls & Export Buttons
- Export group: Split or clustered secondary buttons (CSV, Excel, PNG) using 1px `#CBD5E1` border, white surface, `#0F172A` text, with relevant mini file-type icons.
- Primary buttons: Section-aware background (`#1F6FB5` in Titulados screens, `#14A39A` in Empleadores screens), hover brightness shift 10%, text white.
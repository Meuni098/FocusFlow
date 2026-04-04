# Design System Specification

## 1. Overview & Creative North Star: "The Kinetic Atelier"

This design system is built upon the concept of **The Kinetic Atelier**. It moves away from the rigid, boxed-in nature of traditional productivity tools to create a workspace that feels like a high-end physical studio—precise and organized, yet filled with light, depth, and creative energy.

By blending the mathematical precision of a professional IDE with the fluid, expressive personality of a modern browser, this system breaks the "template" look. We achieve this through:
*   **Intentional Asymmetry:** Using white space as a structural element rather than dividers.
*   **Vibrant Functionalism:** Color is never just decoration; it is a beacon for focus, utilizing high-chroma accents against ultra-refined neutral surfaces.
*   **Layered Transparency:** Utilizing glassmorphism to ensure the user never loses context, creating a UI that feels "breathable."

---

## 2. Color & Surface Architecture

The palette leverages a sophisticated Material Design token structure to ensure tonal harmony across Light and Dark modes.

### The "No-Line" Rule
To maintain a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Structural boundaries must be defined solely through background color shifts or subtle tonal transitions. Use the spacing scale to create "rivers" of negative space that guide the eye naturally.

### Surface Hierarchy & Nesting
Depth is achieved through the physical metaphor of "stacked sheets." 
*   **Base:** Use `surface` for the primary background.
*   **Nesting:** Place a `surface_container_lowest` card inside a `surface_container_low` section to create a soft, natural lift.
*   **Focus:** Use `surface_bright` or `surface_container_highest` only for the most critical interactive elements.

### The Glass & Gradient Rule
Standard "flat" design is insufficient for a premium experience. 
*   **Floating Elements:** Modals and floating action menus must utilize `surface` tokens with 80% opacity and a `20px` backdrop-blur. 
*   **Signature Textures:** Main CTAs and progress indicators should use a subtle linear gradient (e.g., transitioning from `primary` to `primary_container` at a 135° angle). This adds "soul" and visual weight that flat hex codes cannot achieve.

---

## 3. Typography: Editorial Authority

The typographic system pairs the technical, brutalist energy of **Space Grotesk** with the Swiss-inspired legibility of **Inter**.

*   **Display & Headlines (Space Grotesk):** These are our "Editorial Hooks." Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em) to command attention. Page titles should feel like magazine headers—bold and unapologetic.
*   **Body (Inter):** All reading-intensive content uses `body-lg` (16px) or `body-md` (14px). We enforce a generous `1.6` line-height to prevent cognitive fatigue during long sessions.
*   **Data & Meta (JetBrains Mono):** For timestamps, currency, or progress percentages, use JetBrains Mono. This provides a "precise" feel, signaling to the user that this data is accurate and technical.
*   **Labels:** `label-md` is reserved for micro-copy and tags. It should always be set in `Inter Medium` to ensure legibility even at 11px-12px sizes.

---

## 4. Elevation & Depth

Hierarchy is communicated through **Tonal Layering** rather than structural geometry.

### The Layering Principle
Instead of using a border to separate a sidebar, use `surface_container_low` for the sidebar and `surface` for the main content. The shift in tone creates a clear functional split without visual noise.

### Ambient Shadows
When a component must "float" (e.g., a dropdown or a dragged task card), use an **Ambient Shadow**:
*   **Color:** Use a tinted version of `on_surface` (4-8% opacity).
*   **Blur:** High diffusion (20px to 40px blur) with a small Y-offset (4px). This mimics natural, soft-box lighting rather than a harsh digital drop shadow.

### The "Ghost Border" Fallback
If accessibility requirements or complex data density necessitate a border, use a **Ghost Border**:
*   **Token:** `outline_variant` at 15% opacity.
*   **Rule:** It must feel like a suggestion of a line, not a hard stop.

---

## 5. Components

### Buttons
*   **Primary:** High-impact gradient (`primary` to `primary_container`). Border radius: `DEFAULT (8px)`. Use `on_primary` for text.
*   **Secondary:** Glass-style. `surface_container_low` with a subtle `outline_variant` ghost border.
*   **Tertiary:** No background. `primary` text. Use for low-emphasis actions like "Cancel" or "Learn More."

### Cards & Lists
*   **Rule:** Forbid the use of divider lines between list items. 
*   **Implementation:** Separate items using `2px` of vertical white space (Spacing `0.5`) or a very subtle background hover state using `surface_container_high`.
*   **Radius:** Cards must use `xl (1.5rem)` for a friendly, modern feel.

### Chips (Goal Categories)
Chips use the custom goal palette (Savings, Milestone, etc.).
*   **Style:** Use a "Dim" background (e.g., `primary_dim` at 10% opacity) with the high-chroma color for the label text. This ensures the vibrant colors don't overwhelm the UI.
*   **Radius:** `full (9999px)` for a pill-shaped, interactive appearance.

### Input Fields
*   **State:** Default state is a `surface_container_low` fill with no border.
*   **Focus State:** Transitions to a `primary` ghost border (20% opacity) and a subtle inner glow. This "active" state should feel like the field is waking up.

---

## 6. Do’s and Don'ts

### Do
*   **Do** use asymmetrical layouts for dashboards—place high-priority data in larger, off-center containers to create visual interest.
*   **Do** use `JetBrains Mono` for all numerical data to emphasize precision.
*   **Do** rely on the spacing scale (`8`, `12`, `16`) to create "breathing room" between disparate functional groups.

### Don’t
*   **Don't** use 100% opaque, high-contrast borders. It shatters the "glass and light" aesthetic.
*   **Don't** use pure black (#000000) for shadows; always tint them with the surface color to keep the UI feeling cohesive.
*   **Don't** cram content. If a screen feels full, increase the surface container tier instead of adding lines or boxes.
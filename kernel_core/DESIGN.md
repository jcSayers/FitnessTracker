# Design System Strategy: The Command Line Athlete

## 1. Overview & Creative North Star
**Creative North Star: "The Brutalist Architect"**
This design system rejects the "softness" of modern fitness apps. There are no rounded corners, no vibrant motivational gradients, and no organic shapes. Instead, we treat the athlete’s data as a high-level system output. The aesthetic is inspired by "Linux ricing"—the art of customizing terminal environments for peak efficiency and elite visual clarity.

By utilizing intentional asymmetry and a radical commitment to monospaced typography, we move away from a "template" look toward an editorial, high-end "hacker" aesthetic. We break the grid not through chaos, but through staggered text columns and varying line weights, making the user feel they are "rooting" into their own physical performance.

---

## 2. Colors & Surface Architecture
The palette is a study in high-contrast optics. While the base is rooted in `#131313` (Surface), the interaction of light is handled through strict tonal layering.

### The "No-Line" Rule (Refined)
While the original terminal aesthetic uses borders, in this high-end iteration, we use them sparingly for "terminal boxes." For primary content sectioning, we prohibit the standard 1px solid border. Instead, boundaries are defined by shifting from `surface` (#131313) to `surface_container_low` (#1b1b1b). Use the `outline_variant` (#474747) only when a physical "window" or "module" must be explicitly contained.

### Surface Hierarchy & Nesting
Treat the UI as a nested terminal window. 
- **Global Background:** `surface_dim` (#131313).
- **Primary Modules:** `surface_container` (#1f1f1f).
- **Active/Hovered States:** `surface_bright` (#393939).
- **Depth:** Instead of shadows, use "recessed" depth. A card should feel like it was cut *out* of the screen, using `surface_container_lowest` (#0e0e0e) to create a void effect.

### Glass & Texture
To elevate the "ricing" vibe, use `surface_variant` (#353535) with a 60% opacity and a heavy backdrop blur (20px+) for floating command overlays. This creates a "frosted terminal" effect that feels premium rather than dated.

---

## 3. Typography: The Monospaced Editorial
Every character in this system is a fixed-width monolith. We use **Space Grotesk** (as per token specs) or **JetBrains Mono** to maintain the "code" feel while ensuring readability at scale.

*   **Display (3.5rem):** Used for massive, unapologetic metrics (e.g., total weight lifted). Tracking should be tight (-2%) to feel like a high-end fashion masthead.
*   **Headline (2rem):** Used for section headers. Always uppercase. 
*   **Body (1rem):** Used for workout instructions. High line-height (1.6) is mandatory to prevent monospaced text from "clumping."
*   **Label (0.75rem):** The "Status Bar" font. Used for metadata (LVL, XP, TIMESTAMP).

---

## 4. Elevation & Depth
In a monochrome, 0px radius world, traditional depth is the enemy. We use **Tonal Layering** and **Negative Space**.

*   **The Layering Principle:** Stack `surface_container_high` (#2a2a2a) on top of `surface` (#131313) to indicate a modal or a primary action area. 
*   **Ambient Shadows:** If a floating action button (FAB) is required, the shadow must be `#000000` at 40% opacity with a 0px blur and a 4px offset—creating a "hard shadow" that mimics a CLI window.
*   **The Ghost Border:** For secondary data points, use the `outline` token (#919191) at 15% opacity. It should be barely visible, felt rather than seen.

---

## 5. Components

### ASCII Progress Bars (Gamification)
Progress is not a smooth circle; it is a calculation.
*   **Style:** `[||||||||..........]`
*   **Active:** `primary` (#ffffff)
*   **Inactive:** `outline_variant` (#474747)
*   **Usage:** Place inside a `surface_container_low` box for "Level Up" tracking.

### Buttons (Commands)
*   **Primary:** Solid `on_primary_fixed` (#ffffff) background with `on_primary` (#1a1c1c) text. 0px radius. No exceptions.
*   **Secondary:** 1px border using `primary` (#ffffff). Transparent background.
*   **State Change:** On hover, invert the colors immediately (no transition time) to mimic terminal responsiveness.

### Input Fields (The Prompt)
*   **Structure:** Prefixed with a `>` character. 
*   **Border:** Bottom-only border using `secondary` (#c7c6c6). 
*   **Focus:** The entire background shifts to `surface_container_highest` (#353535).

### Lists & Dividers
*   **Forbid standard lines.** Use spacing scale `8` (1.75rem) to separate list items.
*   **Text Dividers:** Use `---` or `===` strings using the `on_surface_variant` (#c6c6c6) color to separate major workout blocks.

### Status Tags (LVL Indicators)
*   **Look:** `[ LVL 14 ]` or `< STATUS: ACTIVE >`. 
*   **Typography:** `label-md`. 
*   **Colors:** `secondary_container` (#464747) background with `on_secondary_container` (#e3e2e2) text.

---

## 6. Do's and Don'ts

### Do
*   **Do** use intentional asymmetry. Align a header to the left and its corresponding value to the far right, separated by a row of dots (`......`).
*   **Do** use uppercase for all labels and headers to reinforce the "system output" feel.
*   **Do** leverage the `surface_container_lowest` for "input wells" to create a sense of physical indentation in the UI.

### Don't
*   **Don't** use border-radius. Even a 1px radius destroys the "Terminal" integrity.
*   **Don't** use drop shadows with blurs over 2px. This is a high-contrast, sharp-edge system.
*   **Don't** introduce a third color. The "soul" of this system is the tension between `#000000` and `#FFFFFF`. Adding a color (like green or blue) makes it a generic tech app; keeping it monochrome makes it high-end editorial.
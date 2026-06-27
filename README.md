# Organic Bio Interface Concept

Experimental organic sci-fi interface demo built with HTML, CSS, SVG filters and vanilla JavaScript.

The interaction keeps the original gooey motion model: a main living biomass is pulled downward, a drop stretches and detaches, then four smaller organic sensor modules form from the material.

## Features

- Organic biomass drag interaction
- Gooey SVG metaball filter
- Stable state machine interaction
- Four bio-sensor modules
- Dynamic console panel with typed diagnostic text
- Hover and tap reactions on active modules
- Background blur overlay
- Escape key and background click close
- Mobile touch support

## Modules

- ORGANISM
- MORPHOLOGY
- NEURAL LINK
- DIAGNOSTICS

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- SVG filters
- Pointer Events API
- Google Fonts: Oxanium and JetBrains Mono

No frameworks, no dependencies, no build process.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Interaction

1. Pull the top biomass downward.
2. Release before the threshold to snap back.
3. Pull past the threshold to detach the drop and open the bio interface.
4. Hover or tap a sensor module to switch console output.
5. Click the background or press `Esc` to close.

## Goal

The goal is a dark, elegant biotech laboratory UI concept: organic, responsive, and experimental without using a framework or build system.

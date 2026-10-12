# Graph Report - Video Totem  (2026-10-12)

## Corpus Check
- 100 files · ~73,188 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 1, .tflite 1)

## Summary
- 164 nodes · 232 edges · 12 communities (7 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0586e05f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CLAUDE.md
- VideoPreviewPlayer.tsx
- canvasRenderer.ts
- MusicTimeline.tsx
- App
- cache-purge-smoke.cjs
- Optimización de AutoReel Studio
- Entrada de quince y clips locales

## God Nodes (most connected - your core abstractions)
1. `VideoPreviewPlayer` - 11 edges
2. `App()` - 9 edges
3. `drawFrame()` - 7 edges
4. `Entrada de quince y clips locales` - 6 edges
5. `Uso` - 5 edges
6. `Optimización de AutoReel Studio` - 5 edges
7. `imageHeight()` - 4 edges
8. `imageSource()` - 4 edges
9. `imageWidth()` - 4 edges
10. `loadImages()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `VideoPreviewPlayer`  [EXTRACTED]
  src/App.tsx → src/components/VideoPreviewPlayer.tsx
- `VideoPreviewPlayer` --calls--> `clearRendererCache()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `drawFrame()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `imageHeight()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `imageSource()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts

## Import Cycles
- None detected.

## Communities (12 total, 5 thin omitted)

### Community 2 - "VideoPreviewPlayer.tsx"
Cohesion: 0.07
Nodes (3): FramingDrag, PreviewHandle, Props

### Community 3 - "canvasRenderer.ts"
Cohesion: 0.11
Nodes (12): VideoPreviewPlayer, clearRendererCache(), DrawableImage, drawFrame(), drawVideoFrame(), imageHeight(), ImageMap, imageSource() (+4 more)

### Community 4 - "MusicTimeline.tsx"
Cohesion: 0.15
Nodes (4): clock(), MusicTimeline(), Props, Props

### Community 5 - "App"
Cohesion: 0.17
Nodes (8): App(), DeferredDialog(), ExportModal, FaqGuideModal, initialProject(), PremiereInspectorModal, TimelineView, Navbar()

### Community 6 - "cache-purge-smoke.cjs"
Cohesion: 0.15
Nodes (6): assert, { chromium }, assert, { chromium }, { execFileSync }, fs

### Community 7 - "Optimización de AutoReel Studio"
Cohesion: 0.33
Nodes (5): Cambios y archivos, Mediciones locales, Optimización de AutoReel Studio, Probar y publicar, Purgar caché de vista previa

### Community 9 - "Entrada de quince y clips locales"
Cohesion: 0.17
Nodes (11): Ajuste: canción completa y tres etapas, Cambios de código, Corrección de pausa automática del cursor musical, Entrada de quince y clips locales, Foto fija después del contador, Herramientas compartidas para Entrada, Prueba musical con vista previa sincronizada, Reconexión automática de originales (+3 more)

## Knowledge Gaps
- **25 isolated node(s):** `Prueba musical con vista previa sincronizada`, `Reconexión automática de originales`, `Recortar música y escuchar el corte`, `Herramientas compartidas para Entrada`, `Cambios de código` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 102 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VideoPreviewPlayer` connect `canvasRenderer.ts` to `App.tsx`, `VideoPreviewPlayer.tsx`, `App`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Prueba musical con vista previa sincronizada`, `Reconexión automática de originales`, `Recortar música y escuchar el corte` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Why does `ExportModal` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `VideoPreviewPlayer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `FaqGuideModal` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `canvasRenderer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10541310541310542 - nodes in this community are weakly interconnected._
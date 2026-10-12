# Graph Report - Video Totem  (2026-10-12)

## Corpus Check
- 100 files · ~72,903 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 1, .tflite 1)

## Summary
- 146 nodes · 217 edges · 9 communities (6 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8f505a7`
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

## God Nodes (most connected - your core abstractions)
1. `VideoPreviewPlayer` - 11 edges
2. `App()` - 9 edges
3. `drawFrame()` - 7 edges
4. `Optimización de AutoReel Studio` - 5 edges
5. `imageWidth()` - 4 edges
6. `imageHeight()` - 4 edges
7. `imageSource()` - 4 edges
8. `loadImages()` - 4 edges
9. `sceneAtTime()` - 4 edges
10. `TimelineView` - 3 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `VideoPreviewPlayer`  [EXTRACTED]
  src/App.tsx → src/components/VideoPreviewPlayer.tsx
- `App()` --calls--> `Navbar()`  [EXTRACTED]
  src/App.tsx → src/components/Navbar.tsx
- `VideoPreviewPlayer` --calls--> `clearRendererCache()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `drawFrame()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `imageHeight()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts

## Import Cycles
- None detected.

## Communities (9 total, 3 thin omitted)

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
Cohesion: 0.22
Nodes (4): assert, { chromium }, { execFileSync }, fs

### Community 7 - "Optimización de AutoReel Studio"
Cohesion: 0.33
Nodes (5): Cambios y archivos, Mediciones locales, Optimización de AutoReel Studio, Probar y publicar, Purgar caché de vista previa

## Knowledge Gaps
- **15 isolated node(s):** `Cambios y archivos`, `Mediciones locales`, `Probar y publicar`, `Purgar caché de vista previa`, `{ chromium }` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 89 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VideoPreviewPlayer` connect `canvasRenderer.ts` to `App.tsx`, `VideoPreviewPlayer.tsx`, `App`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `Cambios y archivos`, `Mediciones locales`, `Probar y publicar` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Why does `TimelineView` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `VideoPreviewPlayer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `PremiereInspectorModal` connect `App` to `App.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `canvasRenderer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10541310541310542 - nodes in this community are weakly interconnected._
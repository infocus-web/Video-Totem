# Graph Report - Video Totem  (2026-10-12)

## Corpus Check
- 104 files · ~76,422 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 1, .tflite 1)

## Summary
- 645 nodes · 1480 edges · 69 communities (46 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25d28d56`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CLAUDE.md
- App.tsx
- ClientInputPanel.tsx
- VideoPreviewPlayer.tsx
- index.ts
- PremiereInspectorModal.tsx
- ref_node_child_process
- Optimización de AutoReel Studio
- Entrada de quince y clips locales
- BackgroundAudioEngine
- AutoReel Studio
- package.json
- smartRotation.ts
- ref_node_assert
- compilerOptions
- main.cjs
- ref_node_fs
- Panel de edición y navegación de fotos
- devDependencies
- ref_node_path
- export-smoke.cjs
- scripts
- encoding-smoke.cjs
- desktop-smoke.cjs
- export-fallback-smoke.cjs
- Verificación de la entrega
- transitions-smoke.cjs
- Encuadre, giro y exportación
- Auditoría de AutoReel Studio — 12 de octubre de 2026
- Exportación estable, encuadre y controles
- dependencies
- entrance-clips-smoke.cjs
- final-photo-smoke.cjs
- music-trim-smoke.cjs
- Modo Tótem TV
- vercel.json
- audit-smoke.cjs
- RecordingClock
- Corrección de la carga de fotos
- vite.config.ts
- horizontal-scenes-smoke.cjs
- production-smoke.cjs
- progress-smoke.cjs
- reconnect-smoke.cjs
- restoration-smoke.cjs
- smart-rotation-smoke.cjs
- text-overlay-smoke.cjs
- TestImage
- Archivos
- react-dom
- engines
- models/README.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 40 edges
2. `SequenceConfig` - 34 edges
3. `VideoPreviewPlayer` - 31 edges
4. `SequenceSlide` - 30 edges
5. `PhotoItem` - 23 edges
6. `BackgroundAudioEngine` - 19 edges
7. `musicRange()` - 19 edges
8. `AutoReel Studio` - 18 edges
9. `react` - 17 edges
10. `decodeProject()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `photo()` --calls--> `localPath()`  [EXTRACTED]
  tests/core.test.ts → src/utils/config.ts
- `editedProject()` --calls--> `buildSlidesFromPhotos()`  [EXTRACTED]
  tests/core.test.ts → src/utils/photoParser.ts
- `App()` --calls--> `ClientInputPanel()`  [EXTRACTED]
  src/App.tsx → src/components/ClientInputPanel.tsx
- `App()` --calls--> `NewProjectModal()`  [EXTRACTED]
  src/App.tsx → src/components/NewProjectModal.tsx
- `App()` --calls--> `PreparationProgress()`  [EXTRACTED]
  src/App.tsx → src/components/PreparationProgress.tsx

## Import Cycles
- None detected.

## Communities (69 total, 23 thin omitted)

### Community 1 - "App.tsx"
Cohesion: 0.08
Nodes (64): App(), DeferredDialog(), ExportModal, FaqGuideModal, initialProject(), PremiereInspectorModal, TimelineView, Navbar() (+56 more)

### Community 2 - "ClientInputPanel.tsx"
Cohesion: 0.10
Nodes (41): lucide-react, react, ClientInputPanel(), EditorSection(), LayoutGlyph(), modes, presetCaptions, presetIcons (+33 more)

### Community 3 - "VideoPreviewPlayer.tsx"
Cohesion: 0.08
Nodes (45): ExportModal(), PreparationProgress(), PreviewHandle, VideoPreviewPlayer, FilePreparationProgress, clearRendererCache(), DrawableImage, drawFrame() (+37 more)

### Community 4 - "index.ts"
Cohesion: 0.11
Nodes (36): Props, Props, Props, Props, TimelineView(), TimelineViewProps, FramingDrag, Props (+28 more)

### Community 5 - "PremiereInspectorModal.tsx"
Cohesion: 0.32
Nodes (7): FaqGuideModal(), Modal(), NewProjectModal(), PremiereInspectorModal(), ParsedPremiereProject, parsePremiereFile(), parsePremiereXml()

### Community 6 - "ref_node_child_process"
Cohesion: 0.17
Nodes (8): assert, { chromium }, { execFileSync }, fs, assert, { chromium }, { execFileSync }, fs

### Community 7 - "Optimización de AutoReel Studio"
Cohesion: 0.40
Nodes (5): Cambios y archivos, Mediciones locales, Optimización de AutoReel Studio, Probar y publicar, Purgar caché de vista previa

### Community 9 - "Entrada de quince y clips locales"
Cohesion: 0.18
Nodes (11): Ajuste: canción completa y tres etapas, Cambios de código, Corrección de pausa automática del cursor musical, Entrada de quince y clips locales, Foto fija después del contador, Herramientas compartidas para Entrada, Prueba musical con vista previa sincronizada, Reconexión automática de originales (+3 more)

### Community 12 - "BackgroundAudioEngine"
Cohesion: 0.17
Nodes (3): BackgroundAudioEngine, musicStepDuration(), scheduleMusicStep()

### Community 13 - "AutoReel Studio"
Cohesion: 0.11
Nodes (18): App de Windows (.exe), AutoReel Studio, Desplegar en Vercel, Ejecutar localmente, Entrada de quince y clips, Estructura y cambios, Exportación de video, Flujo de uso (+10 more)

### Community 14 - "package.json"
Cohesion: 0.12
Nodes (15): author, description, main, name, private, type, version, electron-builder (+7 more)

### Community 15 - "smartRotation.ts"
Cohesion: 0.21
Nodes (9): chooseFaceOrientation(), FaceEvidence, OrientationCandidate, QuarterTurn, uprightFaceScore(), smartRotatePhotos(), SmartRotationResult, turns (+1 more)

### Community 16 - "ref_node_assert"
Cohesion: 0.14
Nodes (8): assert, { chromium }, assert, { chromium }, fs, assert, { chromium }, fs

### Community 17 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 18 - "main.cjs"
Cohesion: 0.23
Nodes (10): { app, BrowserWindow, Menu, protocol, net, session, dialog, powerSaveBlocker }, createWindow(), path, { pathToFileURL }, { trusted, canCheck, canRequest }, allowed, canCheck(), canRequest() (+2 more)

### Community 19 - "ref_node_fs"
Cohesion: 0.15
Nodes (9): assert, { chromium }, fs, assert, { chromium }, fs, assert, { chromium } (+1 more)

### Community 20 - "Panel de edición y navegación de fotos"
Cohesion: 0.17
Nodes (12): Alcance, Cargar solamente la selección, Controles visuales, Diseño de textos, Distribución en dos columnas, Encuadre desplegado y giro inteligente, Entrada y clips, Espacio de trabajo (+4 more)

### Community 21 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, electron, electron-builder, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+3 more)

### Community 22 - "ref_node_path"
Cohesion: 0.18
Nodes (8): assert, { chromium }, fs, path, assert, { chromium }, fs, path

### Community 23 - "export-smoke.cjs"
Cohesion: 0.20
Nodes (6): assert, { chromium }, fs, os, path, { spawn }

### Community 24 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, desktop, desktop:exe, desktop:pack, dev, lint, preview (+1 more)

### Community 25 - "encoding-smoke.cjs"
Cohesion: 0.22
Nodes (6): assert, { chromium }, fs, os, path, { spawn, execFileSync }

### Community 26 - "desktop-smoke.cjs"
Cohesion: 0.22
Nodes (8): assert, { _electron }, { execFileSync }, executable, fs, launch(), path, profile

### Community 27 - "export-fallback-smoke.cjs"
Cohesion: 0.25
Nodes (6): assert, { chromium }, fs, os, path, { spawn }

### Community 28 - "Verificación de la entrega"
Cohesion: 0.25
Nodes (7): Alcance pendiente fuera del entorno local, Cambios funcionales relevantes, Evidencia de navegador, Optimización y continuidad de reproducción, Resultado, Verificación de la entrega, Verificación del relleno sin márgenes

### Community 29 - "transitions-smoke.cjs"
Cohesion: 0.29
Nodes (3): assert, { chromium }, fs

### Community 30 - "Encuadre, giro y exportación"
Cohesion: 0.29
Nodes (6): Archivos, Encuadre, giro y exportación, Límites y efectos, Probar localmente, Qué cambió, Verificar en Vercel

### Community 31 - "Auditoría de AutoReel Studio — 12 de octubre de 2026"
Cohesion: 0.33
Nodes (5): Auditoría de AutoReel Studio — 12 de octubre de 2026, Correcciones, Probar localmente y publicar, Seguridad y límites, Validación

### Community 32 - "Exportación estable, encuadre y controles"
Cohesion: 0.33
Nodes (5): Archivos modificados, Exportación estable, encuadre y controles, Probar localmente, Problema y corrección, Verificar en producción

### Community 33 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, lucide-react, mediabunny, @mediapipe/tasks-vision, react, react-dom

### Community 34 - "entrance-clips-smoke.cjs"
Cohesion: 0.33
Nodes (4): assert, { chromium }, { execFileSync }, fs

### Community 35 - "final-photo-smoke.cjs"
Cohesion: 0.33
Nodes (4): assert, { chromium }, { execFileSync }, fs

### Community 36 - "music-trim-smoke.cjs"
Cohesion: 0.33
Nodes (4): assert, { chromium }, { execFileSync }, fs

### Community 37 - "Modo Tótem TV"
Cohesion: 0.33
Nodes (6): Archivos modificados, Límites y efectos, Modo Tótem TV, Uso, Verificación en producción, Verificación local

### Community 38 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, $schema

### Community 40 - "audit-smoke.cjs"
Cohesion: 0.40
Nodes (3): assert, { chromium }, fs

### Community 42 - "Corrección de la carga de fotos"
Cohesion: 0.50
Nodes (3): Corrección de la carga de fotos, Verificación en Vercel, Verificación local

### Community 43 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 44 - "horizontal-scenes-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 45 - "production-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 46 - "progress-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 47 - "reconnect-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 48 - "restoration-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 49 - "smart-rotation-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 50 - "text-overlay-smoke.cjs"
Cohesion: 0.50
Nodes (3): assert, { chromium }, fs

### Community 52 - "Archivos"
Cohesion: 0.67
Nodes (3): Archivos, Nuevo proyecto, Pestañas de herramientas

## Knowledge Gaps
- **261 isolated node(s):** `{ app, BrowserWindow, Menu, protocol, net, session, dialog, powerSaveBlocker }`, `path`, `{ pathToFileURL }`, `{ trusted, canCheck, canRequest }`, `allowed` (+256 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 317 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ClientInputPanel.tsx` to `App.tsx`, `VideoPreviewPlayer.tsx`, `index.ts`, `PremiereInspectorModal.tsx`, `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `{ app, BrowserWindow, Menu, protocol, net, session, dialog, powerSaveBlocker }`, `path`, `{ pathToFileURL }` to the rest of the system?**
  _261 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07828967178560675 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `ClientInputPanel.tsx` to `App.tsx`, `VideoPreviewPlayer.tsx`, `index.ts`, `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `ClientInputPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09877551020408164 - nodes in this community are weakly interconnected._
- **Why does `BackgroundAudioEngine` connect `BackgroundAudioEngine` to `index.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `VideoPreviewPlayer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08269394714407502 - nodes in this community are weakly interconnected._
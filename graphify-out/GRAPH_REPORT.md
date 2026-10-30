# Graph Report - Video Totem  (2026-10-30)

## Corpus Check
- 106 files · ~78,929 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 1, .tflite 1)

## Summary
- 668 nodes · 1544 edges · 61 communities (43 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3821702`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CLAUDE.md
- App.tsx
- VideoPreviewPlayer.tsx
- videoRecorder.ts
- SequenceConfig
- index.ts
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
- src/utils/canvasRenderer.ts
- ref_node_path
- export-smoke.cjs
- encoding-smoke.cjs
- desktop-smoke.cjs
- export-fallback-smoke.cjs
- Verificación de la entrega
- transitions-smoke.cjs
- Encuadre, giro y exportación
- Auditoría de AutoReel Studio — 12 de octubre de 2026
- Exportación estable, encuadre y controles
- entrance-clips-smoke.cjs
- final-photo-smoke.cjs
- music-trim-smoke.cjs
- Modo Tótem TV
- vercel.json
- audit-smoke.cjs
- RecordingClock
- Corrección de la carga de fotos
- horizontal-scenes-smoke.cjs
- production-smoke.cjs
- progress-smoke.cjs
- reconnect-smoke.cjs
- restoration-smoke.cjs
- smart-rotation-smoke.cjs
- text-overlay-smoke.cjs
- TestImage
- Archivos
- models/README.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 40 edges
2. `SequenceConfig` - 35 edges
3. `SequenceSlide` - 32 edges
4. `VideoPreviewPlayer` - 31 edges
5. `PhotoItem` - 23 edges
6. `BackgroundAudioEngine` - 19 edges
7. `musicRange()` - 19 edges
8. `AutoReel Studio` - 18 edges
9. `encode()` - 17 edges
10. `react` - 17 edges

## Surprising Connections (you probably didn't know these)
- `photo()` --calls--> `localPath()`  [EXTRACTED]
  tests/core.test.ts → src/utils/config.ts
- `editedProject()` --calls--> `buildSlidesFromPhotos()`  [EXTRACTED]
  tests/core.test.ts → src/utils/photoParser.ts
- `RecordingImages` --references--> `ImageMap`  [EXTRACTED]
  src/utils/recordingImages.ts → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `imageWidth()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts
- `VideoPreviewPlayer` --calls--> `imageHeight()`  [EXTRACTED]
  src/components/VideoPreviewPlayer.tsx → src/utils/canvasRenderer.ts

## Import Cycles
- None detected.

## Communities (61 total, 18 thin omitted)

### Community 1 - "App.tsx"
Cohesion: 0.08
Nodes (60): App(), DeferredDialog(), ExportModal, FaqGuideModal, initialProject(), PremiereInspectorModal, TimelineView, Navbar() (+52 more)

### Community 2 - "VideoPreviewPlayer.tsx"
Cohesion: 0.12
Nodes (36): lucide-react, react, react-dom, EditorPropertyRow(), ButtonProps, EditorToolButton(), PhotoFramingControls(), Props (+28 more)

### Community 3 - "videoRecorder.ts"
Cohesion: 0.13
Nodes (24): ExportModal(), downloadBlob(), supportsFrameEncoding(), escapeXml(), fileUrl(), generatePremiereXml(), RecordingImages, createRecordingSource() (+16 more)

### Community 4 - "SequenceConfig"
Cohesion: 0.08
Nodes (48): ClientInputPanel(), EditorSection(), LayoutGlyph(), modes, presetCaptions, presetIcons, presets, Props (+40 more)

### Community 5 - "index.ts"
Cohesion: 0.17
Nodes (13): FaqGuideModal(), Modal(), Props, NewProjectModal(), PremiereInspectorModal(), EntranceConfig, MusicTrim, ParsedPremiereProject (+5 more)

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
Cohesion: 0.16
Nodes (4): BackgroundAudioEngine, musicTime(), musicStepDuration(), scheduleMusicStep()

### Community 13 - "AutoReel Studio"
Cohesion: 0.11
Nodes (18): App de Windows (.exe), AutoReel Studio, Desplegar en Vercel, Ejecutar localmente, Entrada de quince y clips, Estructura y cambios, Exportación de video, Flujo de uso (+10 more)

### Community 14 - "package.json"
Cohesion: 0.04
Nodes (46): author, dependencies, lucide-react, mediabunny, @mediapipe/tasks-vision, react, react-dom, description (+38 more)

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

### Community 21 - "src/utils/canvasRenderer.ts"
Cohesion: 0.10
Nodes (30): SequenceSlide, clearRendererCache(), context2d(), createRenderCanvas(), DrawableImage, drawFrame(), drawVideoFrame(), drawZeroFlash() (+22 more)

### Community 22 - "ref_node_path"
Cohesion: 0.18
Nodes (8): assert, { chromium }, fs, path, assert, { chromium }, fs, path

### Community 23 - "export-smoke.cjs"
Cohesion: 0.20
Nodes (6): assert, { chromium }, fs, os, path, { spawn }

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
Cohesion: 0.29
Nodes (6): Archivos modificados, Exportación con la pestaña oculta, Exportación estable, encuadre y controles, Probar localmente, Problema y corrección, Verificar en producción

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
- **265 isolated node(s):** `Problema y corrección`, `Exportación con la pestaña oculta`, `Archivos modificados`, `Probar localmente`, `Verificar en producción` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 321 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `VideoPreviewPlayer.tsx` to `App.tsx`, `videoRecorder.ts`, `SequenceConfig`, `index.ts`, `package.json`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `Problema y corrección`, `Exportación con la pestaña oculta`, `Archivos modificados` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08216216216216216 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `VideoPreviewPlayer.tsx` to `App.tsx`, `SequenceConfig`, `index.ts`, `package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `VideoPreviewPlayer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11522198731501057 - nodes in this community are weakly interconnected._
- **Should `videoRecorder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1253968253968254 - nodes in this community are weakly interconnected._
- **Should `SequenceConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.0825136612021858 - nodes in this community are weakly interconnected._
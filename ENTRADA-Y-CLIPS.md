# Entrada de quince y clips locales

## Uso

1. En **Fotos**, cargá fotos y/o clips MP4, WebM o MOV. Podés mezclarlos en escenas individuales, pares o tríos. Fotos admite 50 MB por archivo; clips, 200 MB. El límite sigue siendo 400 archivos. Usá MP4 H.264 si el navegador no puede decodificar un clip.
2. En **Encuadre**, los clips tienen los mismos controles de posición, zoom y giro. **Inicio del clip** elige desde dónde reproducirlo. Se repite desde ese punto cuando la escena dura más que el tramo restante. Los clips se reproducen sin sonido propio; se usa la música del proyecto.
3. En **Entrada**, activá el modo para pantalla gigante. Configura 1920 × 1080, sin giro de salida y 60 FPS. Mantiene tus escenas, orden y encuadres como fuentes; las repite en ciclo.
4. Cargá la canción. **Desde** es el segundo inicial de la canción; **Hasta / cero** es el segundo exacto en que el contador llega a cero. Elegí 5 → 0 o 10 → 0. Ejemplo: desde 20 hasta 50, contador 10: el contador empieza en el segundo 40 de la canción, llega a cero en el 50 y el video dura 31 segundos, incluyendo un segundo de cero visible.
5. Tocá **Detectar**. El análisis local identifica ataques, priorizando el bombo. **Cada 1/2/4/8** cambia con esa cantidad de golpes; **Desfase** adelanta o retrasa los cortes. **Cortes** permite editar segundos absolutos, con punto decimal y separados por coma; tocá **Aplicar**.
6. Durante el contador, las escenas cambian cada vez más rápido hasta una por fotograma. El contador permanece encima. A 60 FPS, el mínimo visible es 1/60 s (16,7 ms); 1/1000 s no se puede mostrar completo en esta salida. El cero queda visible un segundo.
7. Exportá el MP4. Los cuadros, clips, contador y música usan el mismo cronograma. La codificación puede tardar más que la duración del video; no saltea cuadros para terminar antes. Entrada y clips requieren Chrome/Edge con codificación por cuadros, sin recurrir a una grabación que altere los tiempos.

El detector de golpes es una ayuda de edición: canciones con ataques suaves, voces o ritmos complejos pueden necesitar correcciones manuales. La línea de tiempo conserva las escenas fuente; los cortes de Entrada se ajustan en su panel. El XML de Premiere conserva la secuencia base y no representa el contador ni la repetición acelerada. En escenas con clips, el XML base tampoco representa su inicio ni repetición; usá MP4 para conservar esos ajustes.

Los proyectos JSON guardan tiempos, cortes y encuadres, pero no fotos, clips ni canciones. Al abrirlos, reconectá los mismos archivos. La huella SHA-256 de la canción permite conservar los cortes ajustados al reconectar el mismo audio; una canción distinta limpia los golpes anteriores para evitar una sincronización incorrecta.

## Cambios de código

- `EntranceControls.tsx`: panel Entrada, selector de tramo y contador, detector cancelable, desfase y cortes manuales.
- `entrance.ts`: selección cíclica, cortes alineados a fotogramas, aceleración y validaciones, sin multiplicar las escenas guardadas.
- `beatDetection.ts` / `beatDetection.worker.ts`: detección de ataques fuera del hilo de interfaz, sin dependencias ni llamadas a servicios.
- `clipMedia.ts`, `previewClips.ts`, `clipFrames.ts`: importación, reproducción local y decodificación precisa de clips. Se usa [CanvasSink de Mediabunny](https://mediabunny.dev/api/CanvasSink), una dependencia que el proyecto ya tenía.
- `App.tsx`, `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx`: integración de Entrada y clips con carga, encuadre, vista previa y duración total.
- `audioSynthesizer.ts`: desplazamiento de música en reproducción y exportación, y huella de archivo para reconexión.
- `canvasRenderer.ts`, `videoEncoder.ts`, `videoRecorder.ts`, `recordingImages.ts`: contador y clips en MP4, con generación determinista y recursos acotados a escenas necesarias.
- `types/index.ts`, `projectStorage.ts`, `projectConfig.ts`, `reconnectPhotos.ts`, `photoFiles.ts`, `photoParser.ts`: metadatos de clips, inicio, selección y proyectos antiguos compatibles.
- `ExportModal.tsx`, `FaqGuideModal.tsx`, README y documentación: alcance de exportación y uso.
- `tests/entrance.test.ts`, `scripts/entrance-clips-smoke.cjs`, `scripts/workspace-layout-smoke.cjs`: verificación del comportamiento nuevo y actualización de navegación a nueve paneles.

## Verificación local y producción

Desde la carpeta del proyecto:

```powershell
npm test
npm run build
npm run dev
```

Abrí la app local y repetí el flujo anterior con tus fotos y canción. Verificá los golpes en reproducción y revisá el MP4 en un reproductor. Los modelos existentes de Giro inteligente se conservan; no se agregaron dependencias para esta función.

Para Vercel: hacé Commit y Push de los cambios, incluyendo los archivos nuevos. Esperá el deploy correcto y recargá la web con Ctrl + F5. Probá nuevamente carga, Entrada, exportación y guardado/reapertura JSON. Las fotos, clips y audio se procesan en el navegador; no se agregó un backend ni un servicio pago. No cierres la pestaña ni suspendas el equipo durante la exportación.

Prueba reproducible de navegador: `scripts/entrance-clips-smoke.cjs` recibe como argumentos la ruta de Playwright, el ejecutable de Chrome y la URL local. Requiere FFmpeg/FFprobe y un clip de prueba en `artifacts/fixture-clip.mp4`; esos programas solo se usan para verificar el desarrollo, no para ejecutar la app. El script exporta y comprueba cuadros, cortes, contador, inicio de audio, movimiento del clip y ausencia de su sonido.

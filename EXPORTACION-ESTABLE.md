# Exportación estable, encuadre y controles

## Problema y corrección

El MP4 de muestra tenía resolución 1920 × 1080, pero una cadencia media de aproximadamente 5,4 cuadros por segundo y pausas de hasta 1,7 segundos entre cuadros. La grabación en tiempo real avanzaba el reloj aunque la carga de originales o el dibujo estuvieran atrasados. Subir el bitrate no corrige esa pérdida de cuadros.

El nuevo camino MP4 usa WebCodecs y Mediabunny para generar cada cuadro con su tiempo fijo, esperando carga y codificación. Si el equipo demora, tarda más en exportar. Se usa el original, se conserva el encuadre y se gira el montaje completo en modo Tótem TV. La música sintética y cargada se renderiza en bloques, con un reloj independiente de la vista previa.

La compresión prioriza detalle con cuantizador 18 si el codificador lo admite; el bitrate alternativo es aproximadamente 24,9 Mbps a Full HD/30 FPS. Los archivos pueden ser más grandes. El límite sigue siendo cinco minutos; original chico o zoom excesivo limitan el detalle. Otros navegadores conservan la grabación compatible en tiempo real. [API de codificación utilizada](https://mediabunny.dev/guide/media-sources).

Restablecer encuadre ahora centra la foto, devuelve el zoom al 100% y quita su giro individual. No modifica otras fotos ni el giro de salida Tótem TV. La vista previa se adapta a la altura disponible; los controles tienen desplazamiento propio y el panel se mantiene visible en escritorio.

## Archivos modificados

- `src/utils/videoEncoder.ts`, `frameEncodingSupport.ts`, `videoRecorder.ts`: codificación por cuadros, comprobación de soporte, cancelación y camino compatible existente.
- `src/utils/audioSynthesizer.ts`, `syntheticMusic.ts`: audio por bloques y las mismas notas para vista previa y exportación.
- `src/components/VideoPreviewPlayer.tsx`, `ExportModal.tsx`, `FaqGuideModal.tsx`: controles que se desplazan, avance y ayuda actualizada.
- `src/components/PhotoFramingControls.tsx`: restablecimiento de posición, zoom y giro individual.
- `src/components/Navbar.tsx`, `src/App.tsx`, `src/index.css`: altura real de la cabecera, panel fijo y tamaño de vista previa.
- `package.json`, `package-lock.json`: Mediabunny 1.61.3 para armar el MP4. Carga diferida al exportar; ninguna API paga ni servidor de video.
- `scripts/encoding-smoke.cjs`, `export-smoke.cjs`, `export-fallback-smoke.cjs`, `framing-smoke.cjs`: archivo real, cadencia, detalle, giros, audio, guardado, cancelación, encuadre y geometría del panel.
- `README.md`, `TOTEM-TV.md`, `ENCUADRE-Y-EXPORTACION.md`, este archivo: funcionamiento, compatibilidad y verificación.

## Probar localmente

```sh
npm install
npm test
npm run build
npm run preview
```

La compilación valida TypeScript. Los scripts de navegador aceptan módulo Playwright, ejecutable Chrome y URL de localhost. Usan perfiles temporales aislados; no acceden a cuentas ni suben multimedia. Playwright y FFmpeg son herramientas externas de verificación, no dependencias de la app.

`encoding-smoke.cjs` acepta además carpeta de originales, ejecutable ffprobe y ejecutable ffmpeg. Exporta a Tótem TV/30 FPS con otra pestaña activa, mide número real de cuadros, continuidad de tiempos, duración/audio y detalle contra cuadros sin comprimir. Resultados y multimedia de prueba quedan en `artifacts/`, excluido de Git.

`export-smoke.cjs` verifica píxeles cuando Chrome presenta el cuadro, no únicamente cuando termina el seek. Prueba también giros actuales/marcados/todos, reconexión, cancelación y Guardar como con cancelar/error/reintentar. `export-fallback-smoke.cjs` fuerza un navegador sin WebCodecs ni captura en segundo plano y comprueba pausa/reanudación. `framing-smoke.cjs` prueba arrastre, touch, reset completo y vista visible en cinco tamaños de pantalla.

Verificación realizada: build y TypeScript correctos, 41 pruebas unitarias y las pruebas de navegador anteriores. Con 30 originales locales se obtuvo un MP4 de 1920 × 1080, 27 segundos y 810 cuadros a 30 FPS reales; 806 cuadros se generaron con la pestaña oculta. El mayor intervalo entre cuadros fue 0,033334 segundos. Tres cuadros comparados en BT.709/YUV dieron SSIM de 0,957 a 0,977. También se probaron ambos sentidos de giro, MP4/WebM y música cargada repetida, conservando su tono al cruzar el límite de bloques.

## Verificar en producción

1. Revisá Changes en GitHub Desktop. Commit sugerido: `fix: export complete video frames and improve framing controls`. Luego Push origin y esperá **Ready** en Vercel.
2. Recargá con Ctrl + F5 y reconectá las fotos. Probá mover, ampliar y girar una foto; Restablecer debe centrarla al 100% y quitar su giro.
3. Abrí los controles inferiores y verificá que la foto siga visible al desplazarlos.
4. Exportá una muestra corta en Tótem TV con Chrome/Edge actualizado. Cambiá de pestaña y volvé para guardar. Revisá continuidad, música, encuadre y giro en el archivo y en tu TV.

No se hizo commit, push ni deploy automáticamente. No cambian variables de entorno, servicios externos ni configuración de Vercel. La exportación y los originales siguen siendo locales. Cerrar/recargar la app o suspender la computadora puede interrumpir la exportación o perder un archivo todavía sin guardar. La compatibilidad con el reproductor de tu TV requiere esa última prueba.

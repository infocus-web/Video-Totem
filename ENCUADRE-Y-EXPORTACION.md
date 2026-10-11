# Encuadre, giro y exportación

## Qué cambió

- **Encuadrar foto**, debajo de la vista previa: arrastrar con mouse/dedo, flechas de teclado, posición y zoom por foto. Al terminar retoma la reproducción si estaba andando.
- **Aplicar giro a**: esta foto, fotos marcadas o todas las del montaje. Giros reales de 90° a izquierda/derecha. La posición, zoom y giro se guardan en el borrador/JSON, sobreviven a reconectar y se respetan en el video.
- Exportación desde los **originales**, cargando únicamente la escena actual y la siguiente. Compresión de unos 15,6 Mbps a 1080 × 1920/30 FPS; las copias de 1920 px quedan para la vista previa.
- En MP4 con Chrome/Edge compatibles, captura directa de fotogramas y reloj de audio permiten grabar con otra pestaña activa. Al terminar, volver a la app completa la verificación del archivo. En WebM o sin esa API, se pausa y continúa al volver, sin cancelar.
- **Elegir dónde guardar al terminar** en Exportar prepara el video y presenta **Elegir ubicación y guardar video**. El selector necesita ese nuevo clic. Cancelarlo o fallar al escribir permite reintentar sin grabar otra vez; también queda disponible la descarga habitual.

## Archivos

- `src/types/index.ts`, `src/utils/photoFraming.ts`: datos y geometría de posición/zoom/giro, validada y compatible con proyectos anteriores.
- `src/components/PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx`: edición por foto, selección para giros, arrastre/táctil/teclado, estado de reproducción y guardado del video listo.
- `src/utils/projectConfig.ts`, `projectStorage.ts`, `src/App.tsx`: actualizaciones por identidad de foto, persistencia y limpieza de URLs de originales/vistas previas.
- `src/utils/canvasRenderer.ts`: geometría y giros compartidos por vista previa/video, sin franjas al rellenar.
- `src/utils/importPhotos.ts`, `recordingImages.ts`: conservar referencias de originales y decodificar hasta dos escenas al exportar, liberando las anteriores.
- `src/utils/videoRecorder.ts`, `recordingSource.ts`, `recordingClock.worker.ts`, `recordingClock.worklet.ts`, `audioSynthesizer.ts`: grabación con captura directa, pausa compatible, audio continuo incluso entre notas y durante el silencio, y mayor bitrate.
- `src/utils/saveVideo.ts`, `src/components/ExportModal.tsx`: Guardar como con extensión correcta y alternativa de descarga.
- `src/components/FaqGuideModal.tsx`, `README.md`, este archivo: ayuda, alcance y pasos de verificación.
- `tests/core.test.ts`, `scripts/framing-smoke.cjs`, `export-smoke.cjs`, `export-fallback-smoke.cjs`: regresiones y pruebas reales de navegador.

No cambian dependencias, variables de entorno ni configuración de Vercel.

## Probar localmente

En la carpeta del proyecto:

```sh
npm test
npm run build
npm run preview
```

Con la vista previa en el puerto 4173 y Playwright disponible como herramienta de desarrollo, ejecutar `node scripts/framing-smoke.cjs`, `node scripts/export-smoke.cjs` y `node scripts/export-fallback-smoke.cjs`. Los scripts aceptan como argumentos adicionales la ruta del módulo Playwright, el ejecutable de Chrome y la URL. La prueba de pestañas usa un perfil temporal de Chrome aislado, sin emulación de foco; no accede a tus perfiles/cuentas.

Comprobaciones: 38 pruebas unitarias, arrastre real con mouse/touch, teclado, zoom, reconexión, giros individuales/marcados/todos, y píxeles de los archivos MP4/WebM. La prueba de Guardar como controla el selector y escribe en el almacenamiento privado del navegador: verifica cancelación, error, reintento y activación de usuario. El diálogo del sistema se comprueba manualmente.

## Verificar en Vercel

1. En GitHub Desktop, revisá Changes, hacé commit y Push origin. Esperá el deploy **Ready** y recargá con Ctrl + F5.
2. Reconectá originales grandes, activá Rellenar cuadro y probá arrastrar una foto. En Encuadrar foto, girá una, marcá dos y girá todas. Guardá JSON, recargá y reconectá: deben mantenerse los ajustes.
3. Exportá diez segundos y cambiá a otra pestaña mientras graba. Volvé al terminar y revisá la imagen, todas las escenas, giro y audio del archivo. En WebM o navegadores sin captura directa, verificá pausa/reanudación.
4. Activá Elegir dónde guardar al terminar. Cancelá el selector una vez y volvé a abrirlo para guardar en una carpeta elegida. Sin selector nativo, probá la descarga habitual.

Commit sugerido: `feat: add photo framing and batch rotation, improve video export`.

## Límites y efectos

- Los videos pueden ocupar más espacio y la exportación usa más memoria por trabajar con originales. Cerrar/recargar la app pierde la grabación y un video todavía sin guardar. Suspender la computadora o descartar una pestaña puede interrumpir el proceso.
- Una foto de baja resolución o un zoom excesivo no recupera detalle al exportar. Los originales no se modifican ni se suben a un servidor.
- Los giros no redistribuyen las escenas ni cambian la clasificación horizontal/vertical usada por el apilado. El borrador es compatible con proyectos anteriores.
- El XML de Premiere sigue siendo una secuencia base: no incorpora los giros, encuadres manuales ni efectos del navegador. Para conservarlos, importá el video final.
- Las pruebas locales no publican cambios en GitHub ni Vercel. Verificar el despliegue y el selector del sistema requiere los pasos anteriores.

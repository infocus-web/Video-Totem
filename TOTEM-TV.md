# Modo Tótem TV

Editás el montaje vertical derecho y exportás un archivo horizontal con un giro real de 90°, sin depender de metadatos de orientación que la TV pueda ignorar. La opción derecha reproduce la orientación de `aylu.mp4`; la izquierda permite usar una pantalla montada al revés.

## Uso

1. En Herramientas de edición, abrí **Formato de salida**.
2. Elegí **Tótem TV · Giro 90° a la derecha** o **a la izquierda**.
3. Encuadrá viendo las fotos derechas. Textos, fondos, apilado y transiciones siguen editándose verticales.
4. En Exportar se confirma **1920 × 1080** y el sentido del giro. Grabá y guardá como siempre.
5. Reproducí el archivo en la TV vertical. Si queda invertido, usá el otro sentido del giro.

Si ya giraste todas las fotos para armar un tótem manualmente, revertí ese giro antes de activar este modo. Los giros individuales quedan independientes y se suman al giro de todo el montaje.

## Archivos modificados

- `src/types/index.ts`, `src/utils/config.ts`, `projectStorage.ts`: opción de giro final, valores predeterminados y persistencia compatible con proyectos anteriores; formato visible normalizado al reabrir.
- `src/utils/videoOutput.ts`: calcula el tamaño horizontal final y valida el giro.
- `src/utils/canvasRenderer.ts`, `videoRecorder.ts`: dibujan la composición vertical y giran el fotograma completo al grabar; verifican las dimensiones del archivo final.
- `src/components/ClientInputPanel.tsx`: opciones Tótem TV dentro del selector existente de Formato.
- `src/components/VideoPreviewPlayer.tsx`, `ExportModal.tsx`: vista vertical derecha y confirmación del formato de salida.
- `src/components/FaqGuideModal.tsx`, `README.md`, este documento: ayuda y límites.
- `tests/core.test.ts`, `scripts/export-smoke.cjs`: dimensiones, persistencia, compatibilidad, video real, textos y sentido del giro.

## Verificación local

```sh
npm test
npm run build
npm run preview
```

Hay 41 pruebas unitarias. El script `scripts/export-smoke.cjs` acepta ruta de Playwright, ejecutable de Chrome, URL de la app, formato (`mp4` o `webm`) y modo (`totem` o `totem-left`). Comprueba giros de fotos, guardar/reabrir/reconectar, vista vertical, archivo horizontal real, giro de los textos, calidad de originales, audio, guardado y cancelación. MP4 se prueba también con la pestaña oculta; WebM comprueba pausa y reanudación. Playwright es una herramienta de verificación externa, no una dependencia del proyecto.

## Verificación en producción

Hacé commit y Push origin en GitHub Desktop. Esperá **Ready** en Vercel, recargá con **Ctrl + F5** y exportá una muestra corta con dos o tres fotos apiladas y un título. Confirmá que el archivo tiene 1920 × 1080 y se ve derecho en la TV. Guardá JSON, recargá y reconectá las fotos para comprobar que conserva el modo. Cambiá a Vertical 9:16 para volver a exportar sin girar.

Commit sugerido: `feat: add Totem TV export with full composition rotation`.

## Límites y efectos

- El XML de Premiere sigue vertical; para conservar el resultado del tótem en Premiere, importá el video final.
- El modo necesita un canvas adicional de resolución completa al grabar; no duplica los originales ni agrega llamadas a servicios externos.
- El MP4 se genera por cuadros en Chrome/Edge compatibles; otros navegadores conservan el modo de grabación compatible. Probá la compatibilidad del MP4 en tu reproductor de TV.
- La exportación por cuadros agrega Mediabunny para armar el MP4. No cambian variables de entorno ni configuración de Vercel. Estos cambios locales no se publican automáticamente. Ver EXPORTACION-ESTABLE.md.

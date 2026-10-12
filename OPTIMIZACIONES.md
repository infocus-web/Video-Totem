# Optimización de AutoReel Studio

Los cambios se aplican al proyecto local `D:\PROYECTOS\VIDEO TOTEM\Video Totem`. No se agregaron dependencias ni se cambiaron las variables de entorno o la configuración de Vercel.

## Cambios y archivos

| Archivos | Cambio |
| --- | --- |
| `src/App.tsx` y `src/utils/projectConfig.ts` | Actualizan solo las partes del proyecto afectadas por cada ajuste. Cargan herramientas secundarias bajo demanda y usan un índice para reconectar fotos. |
| `src/components/VideoPreviewPlayer.tsx` | Conserva reproducción y posición al editar, reutiliza fotos decodificadas y detiene la animación cuando está pausada. Distingue carga de archivos y grabación. |
| `src/utils/canvasRenderer.ts` | Reutiliza imágenes preparadas y decodifica únicamente las nuevas o reconectadas. El progreso incluye las reutilizadas. |
| `src/components/ClientInputPanel.tsx` | Secciones opcionales plegables, presets con descripciones precisas y eliminación del rango de ejemplo fijo. |
| `src/components/Navbar.tsx` | Accesos únicos a ayuda, inspector y exportación. Muestra las dimensiones reales del formato. |
| `src/components/TimelineView.tsx` | Un selector de transición por escena, Fundido compatible con Fade anterior y miniaturas cargadas al acercarse a la pantalla. |
| `src/utils/videoRecorder.ts` y `src/components/ExportModal.tsx` | Comprueban que el archivo tenga pista de imagen y resolución correcta. Reintentan en WebM si Chrome genera un MP4 sin video. Se muestran las etapas del proceso. |
| `src/components/FaqGuideModal.tsx` | Ayuda actualizada para los controles y la reproducción continua. |
| `tests/core.test.ts` | Cuatro regresiones nuevas sobre conservación de fotos, ediciones, rutas y agrupación. |
| `scripts/optimization-smoke.cjs` | Verificación en navegador del rendimiento, reproducción continua, carga diferida, proyectos antiguos y móviles. |
| `scripts/browser-smoke.cjs`, `scripts/fit-smoke.cjs`, `scripts/production-smoke.cjs`, `scripts/restoration-smoke.cjs` y `scripts/transitions-smoke.cjs` | Adaptan los selectores a los controles unificados. La prueba de producción verifica el video descargado, además de su existencia. |
| `README.md` y `VERIFICACION.md` | Instrucciones de uso, ejecución y actualización del repositorio y alcance de las pruebas. |

## Mediciones locales

- JavaScript inicial anterior: **308,66 kB**; optimizado: **288,57 kB**, aproximadamente **6,5% menos**. Las herramientas secundarias pasan a fragmentos que se descargan al abrirlas. Es una reducción de descarga inicial, no del total del código.
- Tres fotos: **6 decodificaciones** iniciales; editar ajustes: **0 adicionales**; incorporar una foto nueva: **2 adicionales**. Las anteriores se reutilizan.
- Vista previa pausada: **0 callbacks de animación** en el intervalo medido de 350 ms. En reproducción, el dibujo se limita a los FPS configurados y el reloj visible se actualiza cada 100 ms.
- TypeScript estricto, build de producción y **22 pruebas de regresión**.
- Chrome: reproducción durante ajustes, carga diferida, guardado/reapertura, Fade antiguo, carga/reconexión de 31 fotos, recorte, exportación con/sin música e inspector XML.
- Editor y línea de tiempo: comprobaciones a **390 y 320 píxeles**, sin desbordes horizontales en los flujos probados.

## Probar y publicar

Desde la carpeta del proyecto:

```sh
npm test
npm run build
npm run dev
```

Abrí `http://localhost:3000`, cargá fotos, reproducí y cambiá el recorte, los textos y una transición. Debe seguir reproduciendo sin volver a pulsar Play. Exportá un montaje corto desde Exportar, abrí el archivo y verificá imagen, sonido y duración.

Para las pruebas de navegador, iniciá `npm run preview` y ejecutá los scripts con un módulo Playwright y Chrome disponibles. No son dependencias del producto. Los reportes y capturas quedan en `artifacts`, excluido de Git.

En GitHub Desktop, revisá los archivos, hacé commit y pulsá Push origin. Cuando Vercel marque el despliegue como Ready, repetí el flujo en la URL de producción. La grabación sigue siendo en tiempo real y depende del navegador; un reintento en WebM requiere otra grabación. El XML conserva su alcance anterior: secuencia base sin todos los efectos ni el recorte del video final.


## Purgar caché de vista previa

El botón **Caché** de la barra superior (ayuda: **Purgar caché**) pausa audio y video, libera las imágenes decodificadas y los reproductores de clips, limpia el buffer de transiciones y reconstruye la vista previa con avance de carga. Conserva el instante actual, proyecto, selección, encuadres, giros, contador, foto final, canción cargada y vínculos a originales. No descarta un MP4 pendiente de guardar. No requiere volver a elegir los archivos.

Se deshabilita durante importaciones, análisis, purga y exportación. Si falta un original conectado, informa el problema para reconectarlo. El navegador administra su propia memoria: liberar referencias no obliga a Chrome a devolver inmediatamente toda la RAM al sistema. El botón no borra el almacenamiento de proyectos ni limpia toda la caché HTTP de Chrome.

También se redujeron actualizaciones de interfaz durante la escucha: el montaje sigue cada instante de audio y el cursor musical visible se actualiza diez veces por segundo; la vista previa evita dibujos duplicados al actualizar el reloj. No cambia la resolución ni los FPS del MP4. Una comparación local de ocho segundos con treinta fotos originales pasó de 482 a 361 dibujos de vista previa; no se reprodujo el bloqueo informado en esa prueba corta y no implica que todos los equipos funcionen igual.

Archivos: `src/components/Navbar.tsx` agrega el botón; `src/App.tsx` coordina estado, mensajes y bloqueo temporal de controles; `VideoPreviewPlayer.tsx` libera y reconstruye imágenes/clips y evita repintados duplicados; `MusicTimeline.tsx` reduce actualizaciones del cursor; `src/utils/canvasRenderer.ts` libera el buffer de transición; `scripts/cache-purge-smoke.cjs` verifica purgas repetidas, audio, edición y exportación; este documento explica alcance y pruebas. Sin dependencias nuevas.

Para probar localmente: `npm test`, `npm run build`, `npm run dev`. Cargá fotos y una canción, activá Entrada y ajustá encuadre, contador y foto final. Reproducí, tocá Caché y esperá la preparación: debe quedar pausado en el mismo punto, con todas las opciones conservadas. Retomá la escucha y exportá. Repetí la purga varias veces. En Vercel, hacé commit/push, esperá el deploy y repetí después de recargar la web. El ejecutable ya generado necesita recompilarse para incluir el botón.

La prueba de navegador se ejecuta con `node scripts/cache-purge-smoke.cjs <ruta-a-playwright> <ruta-a-chrome> <URL-local>` y usa FFmpeg/FFprobe para verificar el MP4; esas herramientas no se agregan a la app. También pasó la regresión de audio/fotos/contador/Espacio en `scripts/audition-preview-smoke.cjs`, además de los 71 tests de lógica y el build.

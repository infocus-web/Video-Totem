# Auditoría de AutoReel Studio — 12 de octubre de 2026

Se revisaron la carga y reconexión de archivos, persistencia, edición, audio, entrada de quince, contador, render, exportación, XML, interfaz adaptable y permisos de escritorio. La aplicación usa React, TypeScript y Vite; el procesamiento de fotos y música ocurre en el dispositivo. No se agregó ninguna dependencia.

## Correcciones

| Problema | Resultado | Archivos |
|---|---|---|
| La escucha musical ignoraba el silencio de la vista previa | Silencio y volumen afectan también la escucha activa | `src/utils/audioSynthesizer.ts`, `src/components/MusicTimeline.tsx` |
| Recargar antes de los 600 ms del autoguardado perdía cambios | Se guarda la versión actual al salir de la página; el indicador cambia a Guardando al editar | `src/App.tsx` |
| Los movimientos cambiados desde la línea de tiempo se perdían al reconstruir el montaje | Se actualizan biblioteca y escenas | `src/App.tsx` |
| Quitar una canción conservaba su huella, recorte y golpes | Se eliminan también esos datos y el vínculo persistente | `src/App.tsx` |
| Entrada volvía al inicio al llegar al final de la canción | Se detiene y conserva el último cuadro; otro Play reinicia desde cero | `src/components/VideoPreviewPlayer.tsx` |
| Iniciar otra exportación descartaba el video todavía sin guardar | Cancelar o fallar conserva el video anterior | `src/components/VideoPreviewPlayer.tsx` |
| Acciones superiores se superponían e impedían abrir la línea de tiempo | Cabecera adaptable sin superposición; dos filas compactas en móvil | `src/index.css` |
| Una carga fallida dejaba decodificaciones e imágenes activas | Se espera el cierre de los trabajos iniciados, se liberan imágenes y se detiene la cola al fallar | `src/utils/canvasRenderer.ts`, `src/utils/importPhotos.ts` |
| Una apertura bloqueada de IndexedDB podía dejar una conexión abierta más tarde | La conexión tardía se cierra | `src/utils/localFileLinks.ts` |
| Separación grande en resoluciones pequeñas producía cajones negativos | Se limita la separación para mantener cajones dentro del cuadro | `src/utils/photoFraming.ts` |
| Un JSON podía asociar distintos archivos al mismo ID o inicios de clip inválidos | Se valida identidad de archivo y se limitan duración e inicio del clip a valores finitos | `src/utils/projectStorage.ts` |
| El desfase de golpes permitía valores fuera del rango del control | Se limita a −2 / +2 segundos | `src/components/EntranceControls.tsx` |
| La duración de Entrada en la línea de tiempo mostraba la suma de escenas base | Muestra la duración real del tramo de canción | `src/components/TimelineView.tsx` |
| Giro inteligente quedaba deshabilitado al seleccionar un clip aunque el lote incluyera fotos | Se habilita cuando el alcance incluye alguna foto | `src/components/PhotoFramingControls.tsx` |
| Electron rechazaba archivos porque Chromium informa `isMainFrame=false` para `fileSystem` | Se permite ese permiso exclusivamente desde el origen local de la app; se mantienen el sandbox y los permisos restringidos | `electron/main.cjs`, `electron/permissions.cjs` |

## Validación

Resultado: **76 pruebas unitarias aprobadas**, tipos y build correctos. Se comprobaron **25 recorridos de navegador**, incluidos los casos de regresión y giro facial. Algunas pruebas antiguas requerían actualizar su navegación y sus esperas; las primeras fallas y sus reejecuciones se conservaron en los registros locales.

Con 30 fotos originales de `SELECCION_ANTO` se exportó un MP4 horizontal de **1920 × 1080**, **27 segundos**, **810 cuadros a 30 FPS**, H.264 High y audio AAC. Se codificaron 806 cuadros con la pestaña oculta. La comparación de tres cuadros con el render antes de comprimir dio SSIM entre **0,9578 y 0,9774**. La prueba completa tardó aproximadamente 116 segundos; la exportación puede llevar más que la duración del video según el equipo. Un primer intento de esta prueba excedió el límite del corredor de pruebas y se repitió con seguimiento explícito del avance.

- Pruebas unitarias y de regresión: `npm test`.
- Tipos: `npm run lint`. Compilación de producción: `npm run build`.
- Pruebas en Chrome sobre la aplicación compilada: selección de carpeta grande, sufijos, reconexión parcial y proyectos antiguos, nuevo proyecto, progreso, caché, encuadre, giro, agrupación horizontal, textos, escucha y recorte musical, clips, entrada, contador, foto final, XML y exportación.
- `tests/audit.test.ts` agrega casos para cargas fallidas, geometría extrema, identidad de archivos en JSON, inicios de clips inválidos y permisos de escritorio.
- `scripts/audit-smoke.cjs` verifica silencio, final fijo, movimientos persistentes, limpieza de música, recarga inmediata, exportación cancelada y botones superiores a 320, 390, 1024 y 1440 px.
- Se actualizaron pruebas de navegador que todavía suponían un panel con todas las herramientas visibles. El Inspector XML ahora se prueba desde la interfaz compilada.
- Scripts modificados: `browser-smoke.cjs`, `encoding-smoke.cjs`, `export-fallback-smoke.cjs`, `export-smoke.cjs`, `fit-smoke.cjs`, `folder-selection-smoke.cjs`, `optimization-smoke.cjs`, `reconnect-smoke.cjs`, `transitions-smoke.cjs` y `entrance-clips-smoke.cjs`. Nuevo: `audit-smoke.cjs`. Todos están en `scripts/`. La prueba de clips genera su propio archivo de ejemplo cuando falta.
- Se contrastan archivos exportados mediante FFmpeg/FFprobe: resolución, duración, cantidad de cuadros, audio y píxeles. La prueba de originales compara también calidad de compresión.

## Seguridad y límites

- `npm audit --omit=dev`: **0 vulnerabilidades conocidas** al realizar esta auditoría.
- El árbol de desarrollo registra **8 alertas moderadas**, provenientes de `sprintf-js` a través del empaquetador de Electron. El [aviso oficial GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) no ofrece una versión corregida. No se aplicó un downgrade automático del empaquetador. Estas alertas no corresponden a las dependencias del sitio compilado; quedan pendientes de una actualización segura del proveedor.
- La corrección del permiso de Electron incluye pruebas unitarias. El ejecutable portable anterior no se actualiza al modificar su código fuente: requiere recompilarse y comprobarse por separado.
- Se conserva la pausa de la exportación alternativa WebM cuando el navegador oculta la pestaña. La exportación MP4 por cuadros puede continuar en segundo plano. El navegador o el sistema pueden ralentizar el proceso; cerrar la app lo interrumpe.
- El giro inteligente conserva fotografías dudosas o sin un rostro detectable. La autorización de archivos depende del navegador y no puede evitarse desde una web.
- El autoguardado al salir cubre navegación y recarga normales; no garantiza recuperar cambios ante un corte de energía o cierre abrupto del proceso.
- Una auditoría con pruebas no garantiza ausencia de defectos en todos los dispositivos, formatos de cámara o reproductores de TV. Conviene probar el MP4 final en la pantalla del evento.
- Se actualizó `graphify-out/` siguiendo las instrucciones del proyecto. Incluye el mapa de código y archivos generados de caché y respaldo; conviene revisarlos por separado del commit de correcciones.

## Probar localmente y publicar

1. Ejecutar `npm test`, `npm run build` y `npm run preview` desde el proyecto.
2. Cargar fotos y canción, editar, recargar inmediatamente y comprobar los ajustes. Probar silencio durante Escuchar, contador y foto final.
3. Exportar un video; iniciar otro y cancelarlo. El primero debe seguir disponible para guardar.
4. Revisar el diff y hacer commit de código, pruebas y este informe. Los medios y capturas de prueba quedan bajo `artifacts/`, excluido de Git.
5. Tras subir el commit y completarse el despliegue de Vercel, repetir estos recorridos en la URL pública. Esta auditoría no hace push ni despliega automáticamente.

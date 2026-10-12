# Panel de edición y navegación de fotos

Las herramientas se reúnen en ocho pestañas: Fotos, Formato, Encuadre, Escenas, Ritmo, Textos, Música y Premiere. Cada botón muestra su propio panel y oculta los demás, sin desplazamiento entre grupos. Exportar permanece en la barra superior. La vista previa muestra la imagen y los controles de reproducción.

Anterior y Siguiente recorren las fotos del montaje, incluidas las que comparten una escena. Se desactivan al llegar al principio o al final. Cambian la foto visible sin modificar su encuadre ni volver a decodificar las imágenes. Al terminar de encuadrar, se retoma la reproducción si estaba activa.

## Diseño de textos

En **Textos**, escribí el título, subtítulo y marca de agua. Elegí **Título**, **Subtítulo** o **Firma** para cambiar su diseño de manera independiente: ocho tipografías, tamaño entre 12 y 180px, nueve ubicaciones y posición horizontal/vertical. El tamaño corresponde a un cuadro de 1080px de ancho y se escala según la resolución. Restablecer devuelve solamente el diseño del texto elegido a sus valores iniciales, conservando su contenido y los demás textos.

Los cambios se ven mientras reproduce la vista previa, quedan guardados en el navegador y en el JSON, y se aplican al MP4 y a la grabación alternativa. En modo Tótem, los textos se giran junto con todo el cuadro al exportar. Las líneas largas se ajustan al ancho disponible y conservan un margen de seguridad; pueden superponerse si elegís la misma ubicación para varios textos. El XML de Premiere sigue sin incluir estas capas de texto.

Plus Jakarta Sans se incluye en la app. Las otras opciones usan fuentes del sistema y una alternativa si no están instaladas; no hay nuevas dependencias ni servicios externos. Los proyectos anteriores mantienen sus valores iniciales y su fuente compatible.

Archivos: `src/components/TextOverlayControls.tsx` agrega los controles; `ClientInputPanel.tsx` los integra en Textos; `src/index.css` organiza las propiedades y miniaturas. `src/types/index.ts`, `src/utils/textOverlay.ts` y `projectStorage.ts` definen, validan y guardan el diseño. `canvasRenderer.ts` usa el mismo dibujo para vista previa y video; `VideoPreviewPlayer.tsx`, `videoEncoder.ts` y `videoRecorder.ts` esperan la carga de fuentes. `tests/core.test.ts` verifica persistencia, compatibilidad y márgenes; `scripts/text-overlay-smoke.cjs` prueba los controles en Chrome y compara los textos de la vista previa con los píxeles del MP4 decodificado.

Para probar localmente: ejecutá `npm test`, `npm run build` y `npm run preview`. Cargá fotos y ajustá los tres textos, guardá/abrí el proyecto y exportá un video corto. En producción, repetí después de Commit → Push y del despliegue de Vercel; reconectá las fotos cuando abras un JSON.

## Cargar solamente la selección

En Fotos, pegá primero la lista de números, rangos o nombres y elegí Carpeta. La app busca por nombre o número antes de decodificar: prepara únicamente las coincidencias. El aviso indica cuántas fotos se cargaron respecto de las fotos compatibles de la carpeta. Si el montaje está vacío, la selección se aplica automáticamente respetando el orden de la lista. En un montaje existente, Aplicar actualiza las escenas cuando lo decidas. Podés usar códigos con sufijo como `461b` y nombres completos como `UMMA-474b.jpg`.

Un archivo faltante o ambiguo cancela la operación antes de preparar imágenes y conserva el montaje anterior. Con la selección vacía, Carpeta carga todas las fotos compatibles; Fotos conserva la selección manual de archivos. Al reabrir un proyecto, elegir Carpeta reconecta sus archivos guardados conservando la edición e ignora nombres ajenos al proyecto. Chrome puede seguir mostrando la cantidad total de archivos de la carpeta en su autorización: ese diálogo permite leer sus nombres y no indica cuántas imágenes se procesan. Las fotos siguen siendo locales.

Archivos: `src/utils/photoFiles.ts` filtra por metadatos; `photoParser.ts` comparte coincidencias, detecta ambigüedades y admite sufijos; `importPhotos.ts` reutiliza los identificadores. `src/App.tsx` filtra antes de importar y arma el montaje inicial. `ClientInputPanel.tsx` y `FaqGuideModal.tsx` describen el flujo. `tests/core.test.ts` cubre carpetas grandes, sufijos, duplicados y reconexión; `scripts/folder-selection-smoke.cjs` verifica en Chrome que se abran únicamente los originales elegidos, incluso con archivos corruptos fuera de la selección.

Para probar: ejecutá `npm test` y `npm run build`; en la app local pegá una lista corta y elegí una carpeta con muchas fotos. Revisá el contador y el orden del montaje. Repetí con un número inexistente y comprobá que se conserve el trabajo. En Vercel, repetí después de Commit → Push y del despliegue.

## Encuadre desplegado y giro inteligente

Encuadre y giro muestra siempre navegación, posición X/Y, zoom, alcance, giros y restablecer. Abrir la pestaña no pausa la reproducción. Editar un valor, cambiar de foto o tocar Arrastrar congela la escena mostrada; Listo o salir del panel retoma la reproducción si estaba activa. Los controles permanecen visibles y las fotos marcadas se conservan al terminar una edición.

Auto / Giro inteligente analiza las cuatro orientaciones de cada foto y usa ojos, nariz y boca para elegir una orientación derecha. Las fotos con rostro pequeño se analizan además en recortes superpuestos; los resultados dudosos conservan el giro anterior. Se aplica una sola vez al terminar el lote, con avance y cancelación. Respeta esta foto, las marcadas o todas; conserva posición, zoom, escenas, originales y salida Tótem. El resultado se guarda y exporta como un giro individual normal. Revisá poses acostadas, perfiles o personas inclinadas: el modelo no conoce la intención de la foto y puede conservar fotos que requieran corrección manual.

Dependencia autorizada: `@mediapipe/tasks-vision`, fijada en **0.10.32**, con BlazeFace short-range v1. Esta versión permite procesamiento sin telemetría de la biblioteca. WASM, JavaScript y modelo se sirven desde la misma app; no se usan CDN de terceros, claves ni endpoints de IA. Solo se descargan al activar Auto: aproximadamente 11.5 MB de WASM sin comprimir (una de las dos variantes), 205 KB de cargador, 137 KB de JavaScript y 230 KB de modelo. La transferencia depende de la compresión y caché del servidor; estos archivos aumentan el tráfico estático normal del sitio. Vite incluye las dos variantes en la compilación para compatibilidad; el navegador solicita solo la que soporta.

Archivos modificados: `VideoPreviewPlayer.tsx` muestra los controles, congela la edición e integra carga/avance/cancelación; `PhotoFramingControls.tsx` agrega Auto junto a los giros; `src/App.tsx` y `projectConfig.ts` aplican orientaciones absolutas sin perder ajustes. `faceOrientation.ts` decide con evidencia facial; `smartRotation.ts` ejecuta MediaPipe bajo demanda; `public/models/` contiene el modelo y su procedencia. `package.json` y lock fijan la dependencia. `FaqGuideModal.tsx`, README y este documento explican el uso. `tests/core.test.ts` cubre incertidumbre, geometría facial e idempotencia; `scripts/smart-rotation-smoke.cjs` prueba el modelo real, alcances, cancelación, controles desplegados y ausencia de tráfico externo. Los archivos de prueba personales se leen desde un argumento y no se incluyen en el repositorio.

En local: `npm test` y `npm run build`; recargá la app y abrí Encuadre sin tocar Arrastrar. Probá posición, zoom, giros, Siguiente y Listo. Elegí Aplicar a → Todas y Auto sobre fotos mezcladas. Comprobá que una foto sin rostro conserve su giro y que Cancelar no aplique resultados parciales. El script acepta las rutas de Playwright, Chrome, la URL local y una foto de prueba con rostro derecho. En Vercel, repetí después de Commit → Push y del despliegue; incluí `public/models/` y el lockfile en el commit. No hace falta configurar variables de entorno.

## Espacio de trabajo

En formato horizontal, las escenas de dos o tres fotos se muestran en columnas, de izquierda a derecha; en vertical y Tótem se mantienen las filas. La agrupación automática reúne fotos verticales para el cuadro horizontal y horizontales para el vertical. Cambiar el formato conserva las escenas y sus ajustes; Reagrupar vuelve a distribuirlas según el formato actual. La vista previa, selección para encuadrar, MP4, miniaturas de la línea de tiempo y posiciones del XML de Premiere usan esta distribución.

Archivos de esta corrección: `src/utils/photoFraming.ts` distribuye los espacios; `photoParser.ts`, `projectConfig.ts` y `src/App.tsx` adaptan la agrupación. `premiereXmlGenerator.ts` posiciona las pistas en ambos ejes. `ClientInputPanel.tsx` y `TimelineView.tsx` muestran los controles y miniaturas según el formato; `VideoPreviewPlayer.tsx` resalta la columna que se edita. `tests/core.test.ts` y `scripts/horizontal-scenes-smoke.cjs` verifican geometría, agrupación, encuadre, MP4 y conservación del Tótem.

Para probar: recargá la app local, elegí Horizontal 16:9 y Escenas → 3 en 1. Cargá tres fotos verticales y comprobá que compartan una escena lado a lado. Ajustá la foto del centro y exportá un video corto. En producción, repetí después de Commit → Push y del despliegue. Los proyectos horizontales existentes con escenas compartidas adoptan las columnas al abrirlos, conservando orden, zoom, giro y posición.

Nuevo, Guardar y Abrir están en la cabecera junto al estado del guardado. Los avisos usan una línea compacta. En escritorio, el editor ocupa dos tercios del ancho y la vista previa el tercio restante; ambos aprovechan la altura disponible. La imagen crece con el espacio del panel, sin el límite anterior de tamaño. Cada panel se desplaza por separado, manteniendo visibles la cabecera, los accesos y la foto. En celulares se conserva la distribución vertical y la cabecera usa dos filas.

Los cambios de esta distribución están en `src/App.tsx` (estructura y avisos), `src/components/Navbar.tsx` (acciones del proyecto), `src/components/ClientInputPanel.tsx` (accesos compactos), `src/components/VideoPreviewPlayer.tsx` (tamaño de la imagen) y `src/index.css` (proporciones y desplazamiento). No cambian los datos ni la codificación del video.

`scripts/workspace-layout-smoke.cjs` verifica siete tamaños de pantalla, las proporciones, controles accesibles sin recortar la cabecera, desplazamiento de la línea de tiempo y guardar/abrir/reconectar un proyecto de 30 fotos.

## Propiedades compactas

Los títulos de sección ocupan una línea. Cada herramienta usa una fila con etiqueta a la izquierda y su control a la derecha, siguiendo la organización de propiedades de editores como Premiere. La caja de selección empieza con una sola línea (30px) y conserva hasta 20.000 caracteres, desplazamiento interno y ampliación manual. Pegar, Limpiar y Aplicar siguen disponibles sin desplegar menús.

Encuadre, agrupación y estilos usan botones compactos. Posición X/Y, zoom, duración y volumen muestran sus valores junto a los controles deslizantes. Las explicaciones complementarias están en los títulos de ayuda al pasar el puntero y en la guía; los avisos necesarios permanecen visibles. Se mantienen los nombres accesibles, el uso con teclado y los controles en celulares.

Esta compactación modifica `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx` e `index.css`, y agrega `EditorPropertyRow.tsx` para compartir la alineación de etiquetas y controles. No modifica los eventos de edición, el guardado ni el exportador. En local, cargá fotos, pegá una selección larga, probá los ocho accesos y verificá encuadre, giros, música y guardado. En Vercel, repetí después de Commit → Push y del despliegue.

## Controles visuales

Los accesos y acciones usan miniaturas con icono y texto corto dentro del botón. El nombre completo se conserva para lectores de pantalla y ayudas. El ajuste activo y el estilo elegido se resaltan; los modos de apilado muestran una, dos o tres divisiones y su nombre. Las fotos apiladas se eligen desde sus miniaturas con número. La visibilidad de textos se controla con un interruptor. Anterior, Siguiente, giros y restablecer conservan sus acciones y alcances.

`EditorTool.tsx` reúne los botones y sus ayudas al pasar el cursor o enfocar con Tab. Escape, clic y desplazamiento cierran la ayuda. Se muestra fuera del panel para que no se recorte; no ocupa espacio del editor. `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx` e `index.css` aplican estos controles. No se agregan dependencias ni cambia la codificación del video.

Para probar: recorré la barra con Tab, verificá las ayudas y usá Escape; cambiá ajuste, apilado y estilo y comprobá el estado activo y la vista previa. Probá el interruptor de textos con clic y Espacio, y la selección de miniaturas. Los scripts de navegador verifican navegación, ayudas, selección, guardado, encuadre y exportación. En producción, repetí después de Commit → Push y de recargar el despliegue.

## Distribución en dos columnas

Cuando el área de herramientas tiene al menos 880px de ancho, los controles del panel elegido se distribuyen en dos columnas. El encuadre usa ese mismo ancho para posición, zoom y giro. Los campos se limitan a 440px. En áreas más angostas se usa una columna y, en celulares, la barra de pestañas se desliza horizontalmente para conservar espacio de edición. Solo se muestra el grupo elegido.

Archivos de esta mejora: `EditorTool.tsx` comparte el texto dentro de las miniaturas; `ClientInputPanel.tsx` aplica nombres cortos y navegación compatible con dos columnas; `PhotoFramingControls.tsx` y `VideoPreviewPlayer.tsx` identifican las acciones de encuadre; `index.css` define miniaturas y distribución; `scripts/workspace-layout-smoke.cjs` comprueba texto dentro del botón y dos columnas. Este documento y `README.md` describen el uso. Los botones ocupan más altura que los iconos anteriores; la distribución aprovecha el ancho disponible. No cambia el guardado ni la exportación.

## Archivos

### Pestañas de herramientas

`src/components/ClientInputPanel.tsx` cambia el contenido con ocho pestañas accesibles, estado seleccionado y navegación con flechas/Inicio/Fin. Los grupos se mantienen montados para conservar sus controles, pero quedan ocultos fuera de la pestaña elegida. `src/App.tsx` guarda la pestaña activa y vuelve a Fotos al crear o abrir un proyecto. `src/components/VideoPreviewPlayer.tsx` termina el encuadre al salir de su panel y retoma la reproducción si estaba activa antes de editar. `src/index.css` distribuye los controles dentro de cada panel. `src/components/FaqGuideModal.tsx`, `README.md` y este documento actualizan el uso.

Los scripts de navegador usan las pestañas reales. `scripts/workspace-layout-smoke.cjs` verifica que cada botón muestra exactamente un panel, conserva el zoom, no interrumpe la reproducción y funciona con teclado y siete tamaños de pantalla. `scripts/framing-smoke.cjs` conserva las comprobaciones de arrastre, giro, reset, navegación y exportación; `scripts/new-project-smoke.cjs` verifica Nuevo y limpieza de avisos. Los demás scripts actualizan la navegación de sus flujos.

Para probar localmente, recargá con Ctrl + F5 y recorré los ocho botones: debe cambiar el título y los controles. Modificá un valor, cambiá de pestaña y volvé: debe conservarse. Solo hace falta desplazar dentro de un panel si sus controles exceden la altura disponible. En producción, repetí después de Commit/Push y del despliegue. No cambia el proyecto guardado, el exportador ni las dependencias.

### Nuevo proyecto

Nuevo abre una ventana centrada con nombre obligatorio (hasta 120 caracteres), Crear proyecto y Cancelar. Cancelar/Escape conserva el montaje. Crear descarga el respaldo JSON si había fotos, libera sus referencias y música e inicia el proyecto con valores predeterminados. El nombre se guarda inmediatamente para evitar recuperar el borrador anterior al recargar. Los originales en disco no se modifican.

El aviso de ANTO persistía porque la vista previa comparaba una caché vacía con un montaje vacío y salía antes de limpiar el error. Ahora el caso vacío limpia error, imágenes, carga, reproducción y posición. Cambiar de proyecto también reinicia el estado de la vista previa, incluido un video pendiente de guardar; las ediciones dentro del mismo proyecto conservan su caché.

Archivos: `src/App.tsx` controla creación, respaldo y nueva sesión de vista previa; `src/components/NewProjectModal.tsx` agrega nombre y acciones; `src/components/Modal.tsx` permite una ventana compacta; `src/components/VideoPreviewPlayer.tsx` limpia errores al vaciar; `scripts/new-project-smoke.cjs` reproduce el error y verifica cancelar, respaldo con encuadre, persistencia, Enter, móvil y vaciar escenas; `README.md` y este documento describen el flujo.

En local, recargá y probá Nuevo → nombre → Crear, Cancelar y Escape. El proyecto creado debe tener cero fotos y no pedir archivos del anterior. Volvé a cargar una foto y reproducila. En producción, repetí después de Commit/Push y del despliegue. Si querés conservar un video generado pendiente de descarga, guardalo antes de crear o abrir otro proyecto.

- `src/components/ClientInputPanel.tsx`: panel único, secciones visibles y accesos directos; fondo junto al encuadre y formato de nombres junto a la selección.
- `src/components/PhotoFramingControls.tsx`: navegación, contador y ajustes individuales, con posición y zoom antes del giro por lote.
- `src/components/VideoPreviewPlayer.tsx`: conserva reproducción y selección; coloca sus controles de encuadre dentro del panel mediante un portal de React. En la línea de tiempo siguen disponibles junto a la vista previa.
- `src/App.tsx`: conecta el panel con los controles y la vista previa, sin duplicar estado de edición.
- `src/index.css`: desplazamiento del panel, vista previa visible y distribución para pantallas chicas.
- `src/components/FaqGuideModal.tsx`, `README.md`, `TOTEM-TV.md`, `ENCUADRE-Y-EXPORTACION.md`: ubicaciones y uso actualizados.
- `scripts/framing-smoke.cjs`: panel visible, accesos fijos, navegación individual/apilada, persistencia, arrastre, reset, reproducción, exportación y cinco tamaños de pantalla. Otros scripts de navegador actualizan los selectores de las secciones.

## Probar localmente

Ejecutá `npm test`, `npm run build` y `npm run dev` en la carpeta del proyecto. Cargá tres fotos y entrá a Encuadre: los controles ya están visibles. Modificá la primera, avanzá con Siguiente y volvé con Anterior: sus ajustes se conservan. Repetí con 2 en 1 desde Escenas y verificá que Siguiente pase de la segunda foto apilada a la siguiente escena. Elegí Música y comprobá que cambie el panel y la foto siga visible. Probá Textos y Premiere y volvé a Encuadre para comprobar los valores conservados.

Las pruebas de navegador necesitan Playwright y Chrome externos; no se agregan dependencias a la app. Los scripts admiten el módulo Playwright, el ejecutable del navegador y la URL local como argumentos. Las capturas y videos de prueba quedan en `artifacts/`, excluido de Git.

## Verificar en Vercel

Después de Commit y Push origin, esperá el despliegue y recargá con Ctrl + F5. Verificá el nuevo panel, navegación, encuadre, formato Tótem y una exportación corta. No requiere variables de entorno ni cambios de configuración en Vercel.

## Alcance

Se muestra un panel por pestaña. Los campos de nombres siguen en Fotos y Reagrupar en Escenas. No se usan acordeones. La edición y el exportador mantienen su comportamiento: reagrupar redistribuye escenas y Aplicar selección reconstruye el montaje. Los originales, proyectos guardados, giro de salida y calidad de codificación se conservan. No se agregan paquetes ni servicios.

## Entrada y clips

Entrada es el noveno panel: sincronización musical y contador final para pantalla horizontal. Fotos permite cargar clips además de imágenes; Inicio del clip aparece en Encuadre. Más detalles en [ENTRADA-Y-CLIPS.md](ENTRADA-Y-CLIPS.md).

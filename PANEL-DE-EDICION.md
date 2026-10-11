# Panel de edición y navegación de fotos

Las herramientas se reúnen en un panel con secciones visibles, en orden de uso: Fotos, Formato, Encuadre y giro, Composición, Ritmo, Textos, Música y Premiere. Exportar permanece en la barra superior. La vista previa muestra la imagen y los controles de reproducción.

Anterior y Siguiente recorren las fotos del montaje, incluidas las que comparten una escena. Se desactivan al llegar al principio o al final. Cambian la foto visible sin modificar su encuadre ni volver a decodificar las imágenes. Al terminar de encuadrar, se retoma la reproducción si estaba activa.

## Espacio de trabajo

Nuevo, Guardar y Abrir están en la cabecera junto al estado del guardado. Los avisos usan una línea compacta. En escritorio, el editor ocupa dos tercios del ancho y la vista previa el tercio restante; ambos aprovechan la altura disponible. La imagen crece con el espacio del panel, sin el límite anterior de tamaño. Cada panel se desplaza por separado, manteniendo visibles la cabecera, los accesos y la foto. En celulares se conserva la distribución vertical y la cabecera usa dos filas.

Los cambios de esta distribución están en `src/App.tsx` (estructura y avisos), `src/components/Navbar.tsx` (acciones del proyecto), `src/components/ClientInputPanel.tsx` (accesos compactos), `src/components/VideoPreviewPlayer.tsx` (tamaño de la imagen) y `src/index.css` (proporciones y desplazamiento). No cambian los datos ni la codificación del video.

`scripts/workspace-layout-smoke.cjs` verifica siete tamaños de pantalla, las proporciones, controles accesibles sin recortar la cabecera, desplazamiento de la línea de tiempo y guardar/abrir/reconectar un proyecto de 30 fotos.

## Propiedades compactas

Los títulos de sección ocupan una línea. Cada herramienta usa una fila con etiqueta a la izquierda y su control a la derecha, siguiendo la organización de propiedades de editores como Premiere. La caja de selección empieza con una sola línea (30px) y conserva hasta 20.000 caracteres, desplazamiento interno y ampliación manual. Pegar, Limpiar y Aplicar siguen disponibles sin desplegar menús.

Encuadre, agrupación y estilos usan botones compactos. Posición X/Y, zoom, duración y volumen muestran sus valores junto a los controles deslizantes. Las explicaciones complementarias están en los títulos de ayuda al pasar el puntero y en la guía; los avisos necesarios permanecen visibles. Se mantienen los nombres accesibles, el uso con teclado y los controles en celulares.

Esta compactación modifica `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx` e `index.css`, y agrega `EditorPropertyRow.tsx` para compartir la alineación de etiquetas y controles. No modifica los eventos de edición, el guardado ni el exportador. En local, cargá fotos, pegá una selección larga, probá los ocho accesos y verificá encuadre, giros, música y guardado. En Vercel, repetí después de Commit → Push y del despliegue.

## Controles visuales

Los accesos y acciones usan iconos con nombres accesibles. El ajuste activo y el estilo elegido se resaltan; los modos de apilado muestran miniaturas de una, dos o tres divisiones. Las fotos apiladas se eligen desde sus miniaturas. La visibilidad de textos se controla con un interruptor. Anterior, Siguiente, giros y restablecer usan flechas, con las mismas acciones y alcances anteriores.

`EditorTool.tsx` reúne los botones y sus ayudas al pasar el cursor o enfocar con Tab. Escape, clic y desplazamiento cierran la ayuda. Se muestra fuera del panel para que no se recorte; no ocupa espacio del editor. `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx` e `index.css` aplican estos controles. No se agregan dependencias ni cambia la codificación del video.

Para probar: recorré la barra con Tab, verificá las ayudas y usá Escape; cambiá ajuste, apilado y estilo y comprobá el estado activo y la vista previa. Probá el interruptor de textos con clic y Espacio, y la selección de miniaturas. Los scripts de navegador verifican navegación, ayudas, selección, guardado, encuadre y exportación. En producción, repetí después de Commit → Push y de recargar el despliegue.

## Archivos

- `src/components/ClientInputPanel.tsx`: panel único, secciones visibles y accesos directos; fondo junto al encuadre y formato de nombres junto a la selección.
- `src/components/PhotoFramingControls.tsx`: navegación, contador y ajustes individuales, con posición y zoom antes del giro por lote.
- `src/components/VideoPreviewPlayer.tsx`: conserva reproducción y selección; coloca sus controles de encuadre dentro del panel mediante un portal de React. En la línea de tiempo siguen disponibles junto a la vista previa.
- `src/App.tsx`: conecta el panel con los controles y la vista previa, sin duplicar estado de edición.
- `src/index.css`: desplazamiento del panel, vista previa visible y distribución para pantallas chicas.
- `src/components/FaqGuideModal.tsx`, `README.md`, `TOTEM-TV.md`, `ENCUADRE-Y-EXPORTACION.md`: ubicaciones y uso actualizados.
- `scripts/framing-smoke.cjs`: panel visible, accesos fijos, navegación individual/apilada, persistencia, arrastre, reset, reproducción, exportación y cinco tamaños de pantalla. Otros scripts de navegador actualizan los selectores de las secciones.

## Probar localmente

Ejecutá `npm test`, `npm run build` y `npm run dev` en la carpeta del proyecto. Cargá tres fotos y entrá a Encuadre y giro → Encuadrar foto. Modificá la primera, avanzá con Siguiente y volvé con Anterior: sus ajustes se conservan. Repetí con 2 en 1 y verificá que Siguiente pase de la segunda foto apilada a la siguiente escena. Desplazá el panel hasta Música y comprobá que la foto siga visible. Usá la barra fija para ir a Textos, Música o Premiere; el encabezado del grupo debe quedar visible debajo de los accesos.

Las pruebas de navegador necesitan Playwright y Chrome externos; no se agregan dependencias a la app. Los scripts admiten el módulo Playwright, el ejecutable del navegador y la URL local como argumentos. Las capturas y videos de prueba quedan en `artifacts/`, excluido de Git.

## Verificar en Vercel

Después de Commit y Push origin, esperá el despliegue y recargá con Ctrl + F5. Verificá el nuevo panel, navegación, encuadre, formato Tótem y una exportación corta. No requiere variables de entorno ni cambios de configuración en Vercel.

## Alcance

Todas las secciones quedan abiertas. También se muestran los campos de nombres y el botón Reagrupar. El panel tiene más contenido para desplazar; los ocho accesos permanecen visibles. La edición y el exportador mantienen su comportamiento: reagrupar redistribuye escenas y Aplicar selección reconstruye el montaje. Los originales, proyectos guardados, giro de salida y calidad de codificación se conservan. No se agregan paquetes ni servicios.

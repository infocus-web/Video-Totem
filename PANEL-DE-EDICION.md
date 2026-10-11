# Panel de edición y navegación de fotos

Las herramientas se reúnen en un panel con secciones desplegables, en orden de uso: Fotos, Formato, Encuadre y giro, Composición, Ritmo, Textos, Música y Premiere. Exportar permanece en la barra superior. La vista previa muestra la imagen y los controles de reproducción.

Anterior y Siguiente recorren las fotos del montaje, incluidas las que comparten una escena. Se desactivan al llegar al principio o al final. Cambian la foto visible sin modificar su encuadre ni volver a decodificar las imágenes. Al terminar de encuadrar, se retoma la reproducción si estaba activa.

## Archivos

- `src/components/ClientInputPanel.tsx`: panel único, secciones ordenadas; fondo junto al encuadre y formato de nombres junto a la selección.
- `src/components/PhotoFramingControls.tsx`: navegación, contador y ajustes individuales, con posición y zoom antes del giro por lote.
- `src/components/VideoPreviewPlayer.tsx`: conserva reproducción y selección; coloca sus controles de encuadre dentro del panel mediante un portal de React. En la línea de tiempo siguen disponibles junto a la vista previa.
- `src/App.tsx`: conecta el panel con los controles y la vista previa, sin duplicar estado de edición.
- `src/index.css`: desplazamiento del panel, vista previa visible y distribución para pantallas chicas.
- `src/components/FaqGuideModal.tsx`, `README.md`, `TOTEM-TV.md`, `ENCUADRE-Y-EXPORTACION.md`: ubicaciones y uso actualizados.
- `scripts/framing-smoke.cjs`: panel, navegación individual/apilada, persistencia, arrastre, reset, reproducción, exportación y cinco tamaños de pantalla. Otros scripts de navegador actualizan los selectores de las secciones.

## Probar localmente

Ejecutá `npm test`, `npm run build` y `npm run dev` en la carpeta del proyecto. Cargá tres fotos y entrá a Encuadre y giro → Encuadrar foto. Modificá la primera, avanzá con Siguiente y volvé con Anterior: sus ajustes se conservan. Repetí con 2 en 1 y verificá que Siguiente pase de la segunda foto apilada a la siguiente escena. Desplazá el panel hasta Música y comprobá que la foto siga visible. Abrí cada título para acceder a los ajustes secundarios.

Las pruebas de navegador necesitan Playwright y Chrome externos; no se agregan dependencias a la app. Los scripts admiten el módulo Playwright, el ejecutable del navegador y la URL local como argumentos. Las capturas y videos de prueba quedan en `artifacts/`, excluido de Git.

## Verificar en Vercel

Después de Commit y Push origin, esperá el despliegue y recargá con Ctrl + F5. Verificá el nuevo panel, navegación, encuadre, formato Tótem y una exportación corta. No requiere variables de entorno ni cambios de configuración en Vercel.

## Alcance

Las secciones secundarias empiezan cerradas y se abren desde su título. La edición y el exportador mantienen su comportamiento: reagrupar redistribuye escenas y Aplicar selección reconstruye el montaje. Los originales, proyectos guardados, giro de salida y calidad de codificación se conservan. No se agregan paquetes ni servicios.

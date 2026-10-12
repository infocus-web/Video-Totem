# AutoReel Studio

## Tótem TV

En **Herramientas de edición → Formato de salida**, elegí **Tótem TV · Giro 90° a la derecha** (como el ejemplo `aylu.mp4`) o a la izquierda según cómo esté montada la pantalla. Editás derecho en vertical, 1080 × 1920, y el video final sale horizontal, 1920 × 1080, con fotos, fondos, transiciones y textos girados juntos. No necesitás girar todas las fotos: el giro individual sirve para corregir cada imagen y se suma al giro final del tótem. Cambiar a Vertical 9:16 vuelve a exportar sin giro.

El modo se guarda en el borrador y JSON. El XML de Premiere conserva la secuencia vertical sin aplicar el giro del tótem. [Archivos y verificación](TOTEM-TV.md).

Editor de fotos a video para fotógrafos. React 19, TypeScript, Vite y Tailwind CSS. Funciona como aplicación estática en Vercel; las fotos y la música se procesan en el navegador.

Conserva el estilo visual de Google AI Studio con herramientas organizadas por pestañas, vista previa con marco de teléfono y transiciones Fundido, Zoom y Wipe. Las rutas de Premiere están en una sección opcional. Veo se omitió por pedido del usuario: no incluye botones de generación con IA, rutas API, servidor Express ni configuración de Gemini.

## Ejecutar localmente

Requisitos: Node.js 22.12 o superior (recomendado Node 22 LTS o 24 LTS) y npm.

Dentro de la carpeta que contiene package.json:

~~~sh
npm ci
npm run dev
~~~

Abrí http://localhost:3000. No hacen falta claves API, archivos .env, Gemini ni una base de datos.

Para verificar y probar la compilación de producción:

~~~sh
npm test
npm run build
npm run preview
~~~

La vista previa de producción se abre en http://localhost:4173. No abras index.html directamente desde el disco.

## Subir a GitHub

Los cambios se aplican directamente en **D:\PROYECTOS\VIDEO TOTEM\Video Totem**, el repositorio local existente. En GitHub Desktop, seleccioná Video-Totem, revisá Changes, hacé un commit y pulsá Push origin.

No subas node_modules, dist, artifacts ni archivos .env. El .gitignore ya los excluye. La carpeta .git y el historial del repositorio se conservan. No necesitás descomprimir ni subir un ZIP.

## Desplegar en Vercel

1. En Vercel, elegí Add New → Project e importá el repositorio de GitHub.
2. Framework Preset: **Vite**.
3. Root Directory: la carpeta que contiene package.json. Si subiste la carpeta autoreel-studio completa dentro del repositorio, seleccioná autoreel-studio.
4. Install Command: **npm ci**.
5. Build Command: **npm run build**.
6. Output Directory: **dist**.
7. Node.js: **22.x** o **24.x**.
8. Variables de entorno: **ninguna**.
9. Pulsá Deploy.

vercel.json declara el framework, la compilación, la salida y encabezados básicos de seguridad. Los pushes posteriores al repositorio conectado generan nuevos despliegues según la configuración de Vercel.

Documentación oficial: https://vercel.com/docs/frameworks/frontend/vite

## Panel de edición

Las escenas compartidas se adaptan al formato: dos o tres fotos verticales lado a lado en horizontal, y fotos horizontales apiladas en vertical. Tótem conserva la composición vertical antes de girar el video. La distribución coincide en vista previa, MP4 y posiciones del XML de Premiere.

Para cargar solo las fotos solicitadas, pegá primero los números o nombres y elegí **Carpeta**. Se filtran antes de preparar las imágenes; un montaje vacío se arma automáticamente con esa selección. Con la lista vacía se carga la carpeta completa. **Fotos** mantiene la elección manual. [Flujo y pruebas](PANEL-DE-EDICION.md#cargar-solamente-la-selección).

En **Textos** podés elegir entre ocho tipografías y ajustar por separado el tamaño y la ubicación del título, subtítulo y marca de agua. Los botones ofrecen nueve posiciones y los deslizadores permiten afinar el encuadre. Se guardan en el proyecto y se aplican a la vista previa y al video exportado. [Uso, archivos y pruebas](PANEL-DE-EDICION.md#diseño-de-textos).

La cabecera compacta reúne Nuevo, Guardar, Abrir y el estado del guardado. En escritorio, el espacio de trabajo ocupa la altura disponible: dos tercios del ancho para edición y un tercio para la vista previa ampliada. Cada panel se desplaza de forma independiente. Los avisos ocupan una línea compacta. En celulares, la cabecera usa dos filas y los paneles se distribuyen verticalmente. [Archivos y pruebas del panel](PANEL-DE-EDICION.md).

**Nuevo** abre una ventana para escribir el nombre. Crear proyecto inicia un montaje vacío y limpia las fotos, música y avisos anteriores; si había fotos, descarga antes su respaldo JSON. Cancelar o Escape conserva el proyecto actual. El nuevo nombre se guarda inmediatamente en el navegador.

Las propiedades se editan en filas: etiqueta a la izquierda y control a la derecha. La selección de archivos usa una caja de una línea que podés ampliar desde la esquina inferior; conserva mensajes largos y rangos. Los botones de ajuste, agrupación y estilo ocupan una fila compacta. Posición, zoom, duración y volumen muestran sus valores junto al deslizador. Las explicaciones ampliadas están en la guía y en las ayudas al pasar el puntero.

La barra y las acciones usan miniaturas con icono y texto corto dentro del botón. Los ajustes activos se resaltan. El apilado muestra sus divisiones y nombre; las fotos apiladas se seleccionan por su imagen y número. La visibilidad de textos usa un interruptor. Las ayudas completas aparecen con el cursor o Tab y se cierran con Escape, clic o desplazamiento. Dentro de cada panel, los controles aprovechan dos columnas cuando hay al menos 880px de ancho; en áreas más chicas usan una columna.

Ocho pestañas, en este orden: **Fotos → Formato → Encuadre → Escenas → Ritmo → Textos → Música → Premiere**. Cada botón reemplaza el contenido por su propio panel; no necesitás desplazarte para encontrar otro grupo. La pestaña activa se resalta y conserva los ajustes al cambiar. Las flechas izquierda/derecha, Inicio y Fin recorren las pestañas con teclado. La vista previa permanece visible y, en pantallas chicas, aparece arriba.

En **Encuadre y giro**, los controles de posición, zoom, giro y navegación están siempre visibles. **Arrastrar** pausa la escena para mover la foto directamente; cambiar un control también inicia la edición sin otro clic. **Listo** conserva los controles visibles y retoma la reproducción si estaba activa. **Anterior** y **Siguiente** recorren todas las fotos del montaje sin perder sus ajustes.

**Auto / Giro inteligente** analiza los rostros localmente y endereza las personas en pasos de 90°. Respeta **Aplicar giro a**: esta foto, las marcadas o todas. Las fotos sin evidencia clara conservan su giro; cancelar conserva todo el montaje anterior. Es una acción opcional: revisá poses acostadas o intencionalmente inclinadas. No cambia los originales ni el giro de salida Tótem. MediaPipe y el modelo se cargan recién al usar la herramienta, sin API ni clave. [Archivos, límites y pruebas](PANEL-DE-EDICION.md#encuadre-desplegado-y-giro-inteligente).

## Flujo de uso

1. Elegí fotos individuales o una carpeta completa. Si la selección está vacía y todavía no hay escenas, el montaje se arma automáticamente con todas las fotos. Pulsá Reproducir para verlo.
2. Si usás Premiere, abrí Premiere y Google Drive y pegá la ruta absoluta, por ejemplo D:\Fotos\Sesion o /Users/usuario/Fotos/Sesion. El navegador no puede obtener esta ruta.
3. Pegá la selección del cliente: números, nombres, códigos de cámara o rangos. Ejemplo: 004, 012, 025-028, DSC_1020.jpg.
4. Pulsá Aplicar selección. Si hay fotos faltantes o nombres ambiguos, se muestra el problema y se conserva el montaje anterior. También podés usar todas las fotos.
5. Elegí formato, estilo, duración, música y textos. Los presets Boda, Fiesta, Portfolio e Inmobiliaria ajustan estilo y ritmo.
6. Las tarjetas 2 en 1, 3 en 1, Inteligente e Individual aplican el modo al elegirlo. En Composición de escenas, Reagrupar montaje permite restablecer ese modo después de editar cuadros individuales. Conservan el orden y los movimientos; cada grupo toma la duración y transición de su primera foto. La distribución de escenas cambia.
7. En Línea de tiempo, cambiá el orden, duración, transición y movimiento. Fundido, Zoom y Wipe pueden aplicarse a todas las escenas o desde el selector de cada escena. Los proyectos anteriores con Fade siguen funcionando y se muestran como Fundido. Elegir un diseño con más fotos consume fotos de escenas siguientes; elegir una foto por escena divide el grupo sin perder fotos.
8. Abrí Exportar para grabar el video final o descargar el XML para Premiere.
9. Usá Guardar proyecto JSON para llevarte el montaje. Nuevo proyecto descarga un respaldo del anterior antes de abrir una sesión vacía.

Aplicar selección reconstruye las escenas a partir del texto, la duración y la transición general configuradas. Editar el texto solo no modifica las escenas hasta pulsar Aplicar selección. Las tarjetas de agrupación redistribuyen las escenas inmediatamente. Cambiar la duración general actualiza todas las escenas.

La reproducción y su posición se mantienen al cambiar encuadre, textos, duración, agrupación, transiciones, movimientos y volumen. Cargar archivos nuevos, abrir otro proyecto o exportar pausa la vista previa. También se pausa al ocultar la pestaña.

Pegar mensaje de WhatsApp lee el portapapeles real con permiso del navegador. Si el navegador no lo permite, pegá con Ctrl + V. Los campos de nombres están en Fotos del proyecto → Formato de nombres para la selección y la separación del apilado tiene botones de 0, 4, 8, 12 y 16 píxeles.

## Rellenar las fotos sin márgenes

En **Herramientas de edición → Encuadre y giro**, elegí **Rellenar cuadro (recortar)**. La foto se amplía hasta cubrir todo su cuadro sin estirarla. El recorte empieza centrado y afecta los lados o la parte superior e inferior según las proporciones.

Para moverlo, tocá **Encuadrar foto** en el panel Encuadre y giro y arrastrá la imagen con el mouse o el dedo. También hay controles de encuadre horizontal, vertical y zoom (100–300%). Si un eje no tiene espacio para desplazarse, aumentá el zoom. Elegí la escena y, en fotos apiladas, la foto que querés ajustar; también podés tocar directamente esa foto en la vista previa. Con el canvas enfocado, las flechas desplazan el encuadre y Shift aumenta el paso.

**Listo, volver a la vista previa** retoma la reproducción si estaba andando. El encuadre se guarda por foto en el borrador y en el JSON, se conserva al reconectar o reagrupar y se aplica al video final. El XML base de Premiere conserva su alcance anterior: el encuadre manual se debe ajustar allí o importar el video final.

En el mismo panel, **Aplicar giro a** permite elegir **Esta foto**, **Fotos que marque** o **Todas las fotos del montaje**. Marcá las fotos por nombre y pulsá **Girar 90° a la izquierda/derecha**. Cada clic agrega un cuarto de vuelta; cuatro clics recuperan el giro inicial. Se gira la imagen real, conservando su posición y zoom. No redistribuye las escenas ni modifica los archivos originales. Restablecer encuadre centra, quita el zoom y elimina el giro individual. Conserva el giro de salida del modo Tótem TV.

Se aplica a las fotos individuales y a cada espacio de las escenas 2 en 1 / 3 en 1, tanto en la vista previa como en el video descargado. Los movimientos también mantienen el cuadro cubierto. El fondo queda desactivado mientras el relleno está seleccionado.

Para un apilado continuo sin líneas entre fotos, elegí **0px** en la separación. Para ver la imagen entera nuevamente, seleccioná **Mostrar foto completa**. La opción queda guardada en el JSON y en este navegador. Los proyectos anteriores se abren con Mostrar foto completa para conservar su encuadre.

Rellenar puede cortar personas u objetos cerca de los bordes; revisá la vista previa antes de exportar. Los archivos originales permanecen intactos.

La vista previa se actualiza al terminar de cargar las fotos. La grabación captura los fotogramas explícitamente para admitir imágenes estáticas; cuando elegís Sin música, la pista de audio queda en silencio para mantener estable el codificador. El formato MP4/WebM disponible se muestra antes de grabar.

La búsqueda intenta primero el nombre exacto, sin distinguir mayúsculas. Si la entrada era un número, también busca el número al final de los nombres reales. Un nombre de archivo explícito nunca se sustituye por otro prefijo. Evitá pegar fechas, teléfonos u otros números ajenos a la selección.

Al elegir una carpeta se conserva la estructura de subcarpetas debajo de su raíz. Para reconectar un proyecto, elegí la misma carpeta raíz. Si hay nombres repetidos en subcarpetas, usá un conjunto de archivos sin nombres ambiguos o elegí esas fotos individualmente.

## Fotos y música

- Fotos: JPG, JPEG, PNG, WebP y AVIF; hasta 400 archivos por biblioteca, 50 MB por foto y 100 megapíxeles por imagen.
- RAW y HEIC: convertí a JPG o PNG antes de cargarlos.
- Se preparan copias locales de hasta 1920 píxeles en su lado largo para la vista previa. La exportación de video decodifica los originales de la escena actual y la siguiente (hasta seis fotos), libera los anteriores y conserva la resolución necesaria para recortar y ampliar. El XML referencia los originales con sus dimensiones originales.
- Audio: música sintética integrada o un archivo de audio compatible con el navegador, hasta 50 MB. La música cargada reemplaza la sintética y se repite si es más corta que el montaje.
- Sin música elimina el audio del montaje. El control Silenciar afecta la escucha de la vista previa; la exportación usa el volumen configurado.
- Para sesiones grandes, la memoria y la velocidad dependen de tu computadora. Dividí el trabajo en montajes cortos si el navegador se queda sin memoria.
- No se suben fotos, audio ni proyectos a un servidor. No hay llamadas a servicios de IA ni fuentes externas.

## Exportación de video

En Chrome/Edge compatibles, el MP4 H.264/AAC se genera **cuadro por cuadro con WebCodecs**, usando los originales. El tiempo de cada cuadro es su índice dividido por los FPS: cargar fotos o codificar más lento no hace avanzar el montaje ni saltea cuadros. Se espera la carga de la escena y su siguiente transición antes de dibujar. Mediabunny arma el contenedor MP4 y controla la cola del codificador; se carga únicamente al exportar.

Se prioriza el detalle de las fotos con cuantizador 18 donde el codificador lo admite y bitrate alternativo de aproximadamente **24,9 Mbps a Full HD/30 FPS** (hasta 60 Mbps según resolución/FPS). El archivo usa H.264 y AAC de 48 kHz, con el giro Tótem TV incorporado a la imagen. La música se genera en bloques locales, sin depender del reloj de reproducción ni de la pestaña activa.

Hasta 5 minutos. Podés cambiar de pestaña durante la codificación, pero mantené la página abierta y la computadora despierta. El porcentaje refleja cuadros completados; si el equipo es lento, tarda más en exportar. Se comprueba que el codificador haya entregado todos los cuadros antes de descargar. Los archivos pueden pesar más; se mantienen en memoria hasta guardarlos. Una foto pequeña o un zoom excesivo sigue limitado por su detalle original.

Los navegadores sin WebCodecs o sin los codificadores necesarios conservan el modo compatible de grabación en tiempo real con MediaRecorder. Ese modo depende del rendimiento del equipo. MP4 sin pista de imagen se reintenta en WebM; WebM o captura sin soporte de segundo plano se pausa al ocultar la pestaña y continúa al volver. La etapa muestra la pausa. Para la exportación por cuadros, usá Chrome o Edge actualizado en una computadora.

Para elegir la carpeta y el nombre, activá **Elegir dónde guardar al terminar** en Exportar. Cuando esté listo, pulsá **Elegir ubicación y guardar video**. Este nuevo clic abre el selector nativo en navegadores compatibles y HTTPS/localhost. Cancelar o recibir un error de escritura conserva el video para reintentar, sin volver a grabar. También podés descargarlo con la configuración habitual del navegador. Si el selector no está disponible, configurá el navegador para preguntar dónde guardar las descargas. El archivo terminado permanece en memoria hasta guardarlo, reemplazarlo por otra grabación o cerrar la página.

El video incluye fotos apiladas, fondos, movimientos, transiciones, títulos, marca de agua y audio. No cambia la extensión de un WebM para hacerlo pasar por MP4.

Fundido mezcla escenas completas para evitar fondos oscuros. Wipe reemplaza la escena de izquierda a derecha, incluyendo los márgenes. Las transiciones se muestran al final de cada escena que tiene una siguiente; la última termina sin un salto al inicio.

## Premiere: alcance del XML

El XML de intercambio xmeml contiene los originales, rutas, orden, duración y pistas simultáneas para escenas con dos o tres fotos. Incluye escala y posición básicas.

**No incluye encuadre manual, giros, fondos difuminados, textos, música, transiciones ni animaciones del navegador.** Verificá escala y posición en tu versión de Premiere. Para conservar todo el diseño, descargá el video final e importalo como un clip.

El XML base sigue mostrando la foto completa: no incorpora el recorte de Rellenar cuadro. Ese recorte se conserva en el video exportado; importá ese video en Premiere si querés mantenerlo exactamente.

En Premiere: Archivo → Importar → elegí el XML. Los originales deben existir en la ruta local indicada; si se movieron, usá la vinculación de medios de Premiere.

El inspector lee XML de intercambio xmeml exportado desde Premiere y respeta tiempos de línea de tiempo y pistas simultáneas. Para un .prproj nativo, primero exportá Archivo → Exportar → Final Cut Pro XML. No se inventan clips ni versiones de Premiere cuando un archivo no puede interpretarse. FCPXML y límites de transición especiales con start/end -1 muestran un error descriptivo.

No se genera un ExtendScript incompleto ni se promete ejecutar Premiere desde el navegador.

## Guardado y privacidad

El montaje se guarda automáticamente en localStorage de este navegador y dominio, con una versión de formato. El JSON conserva configuración, escenas, selección, nombres y rutas, pero **no incluye las fotos ni la música**.

En Chrome/Edge compatibles, los botones Fotos, Carpeta y Cargar música recuerdan el acceso de lectura a los originales. Al recargar, reiniciar Chrome o abrir el JSON del mismo proyecto, se reconectan automáticamente mientras el permiso siga vigente. Si Chrome necesita renovarlo, aparece **Reconectar originales**: al tocarlo podés elegir **Permitir en cada visita** si el navegador ofrece esa opción. Los archivos cargados antes de esta función requieren elegirse una vez con los nuevos botones. En navegadores sin esta API sigue disponible la selección manual.

Se guardan únicamente los handles de acceso en IndexedDB, separados por proyecto; no se guardan copias de fotos, clips o canciones ni se suben a Vercel. El JSON incluye un identificador local, pero no los handles. Si abrís el proyecto en otro equipo, perfil de Chrome o dominio, elegí los originales allí. Si moviste o borraste un archivo, elegí su nueva ubicación; la app no puede recorrer carpetas a las que no le diste acceso. Borrar los datos del sitio elimina los vínculos locales. Descargá JSON para tener un respaldo portátil de la edición.

El JSON incluye rutas de archivos de tu computadora y textos del evento. Revisalo antes de compartirlo o publicarlo en un repositorio. El editor no necesita guardar datos de clientes en GitHub.

## Google Drive

El campo de Drive guarda un enlace de referencia y permite abrirlo. Para usar las fotos, descargá o sincronizá la carpeta con Drive para escritorio y elegila desde tu computadora. Esta versión no implementa OAuth ni acceso directo a carpetas privadas de Google.

## Pruebas y verificación

npm test ejecuta las pruebas de regresión de selección, agrupación, rutas, XML, guardado, reconexión, giros por selección, compatibilidad de proyectos anteriores y encuadre manual sin franjas durante los movimientos. npm run build también verifica TypeScript en modo estricto.

La prueba opcional de navegador está en scripts/browser-smoke.cjs. No agrega dependencias al producto. En un entorno de desarrollo, podés instalar Playwright temporalmente:

~~~sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
~~~

Con npm run dev en otra terminal:

~~~sh
node scripts/browser-smoke.cjs
~~~

Los resultados quedan en artifacts, excluido de Git. El script también acepta la ruta del módulo Playwright y la del ejecutable de Chrome como argumentos. Esta prueba usa módulos de desarrollo de Vite; no está pensada para correr contra la versión de producción.

## Verificar el despliegue

1. Abrí la URL HTTPS de Vercel en Chrome o Edge.
2. Conectá tres fotos propias, pegá sus números y aplicá la selección.
   Con selección vacía y sin escenas, las fotos deben aparecer en un montaje automáticamente al cargarlas.
3. Reproducí el montaje y escuchá la música.
4. Grabá un video corto; verificá resolución, duración, textos y audio.
5. Exportá el XML e importalo en Premiere en la misma computadora donde están los originales.
6. En Chrome, elegí fotos y música con los botones que recuerdan la ubicación. Recargá y reiniciá el navegador: deben reconectarse conservando la edición. Si el permiso caduca, usá Reconectar originales. Un archivo elegido con el selector antiguo o en un navegador sin esta API requiere reconexión manual.
7. Revisá la consola del navegador y que Vercel haya completado el build.
8. En Línea de tiempo, elegí Todas: Wipe y cambiá una escena a Fundido. Comprobá la vista previa, la grabación y el guardado JSON.
9. En Encuadre y giro, activá Rellenar cuadro. Probá una foto horizontal sola, un apilado y la separación de 0px. El video descargado debe cubrir el cuadro. Al volver a Mostrar foto completa, debe recuperarse el encuadre anterior.

La entrega fue verificada localmente; el despliegue en tu cuenta y la importación real en Adobe Premiere requieren estas comprobaciones.

## Estructura y cambios

- src/App.tsx: estado persistente del proyecto, conexión de archivos y edición de escenas.
- src/components: formularios conectados, vista previa, línea de tiempo y ventanas accesibles.
- src/components/ClientInputPanel.tsx, Navbar.tsx y VideoPreviewPlayer.tsx: diseño de Studio, tarjetas conectadas, portapapeles real y vista previa con marco de teléfono.
- src/components/TimelineView.tsx y src/types/index.ts: Fade/Wipe/Zoom por escena y para todo el montaje, con tipos completos.
- src/utils/photoParser.ts: selección sin fotos de stock ni archivos inventados.
- src/utils/importPhotos.ts: lectura local, orientación real, preparación de imágenes y limpieza de recursos.
- src/utils/canvasRenderer.ts: motor visual compartido por vista previa y grabación.
- src/types/index.ts, src/utils/config.ts y projectStorage.ts: opción de encuadre, guardado y compatibilidad con proyectos anteriores.
- src/components/ClientInputPanel.tsx y FaqGuideModal.tsx: controles de encuadre, separación 0px y ayuda.
- src/utils/videoEncoder.ts, videoRecorder.ts, audioSynthesizer.ts y syntheticMusic.ts: exportación por cuadros, música local y modo compatible de grabación.
- src/utils/projectStorage.ts: JSON versionado, validación y recuperación del proyecto.
- src/utils/premiereParser.ts y premiereXmlGenerator.ts: intercambio XML sin datos simulados.
- package.json y package-lock.json: dependencias reducidas e instalación reproducible.
- vite.config.ts, tsconfig.json y vercel.json: configuración de desarrollo, TypeScript y Vercel.
- tests/core.test.ts: pruebas de los casos que fallaban en la versión anterior.
- src/index.css y public/fonts: tipografía Plus Jakarta Sans servida localmente con su licencia y estilos del editor.
- scripts/restoration-smoke.cjs y transitions-smoke.cjs: importación automática, controles, persistencia, píxeles de las transiciones y adaptación a móviles.
- scripts/fit-smoke.cjs: recorte en fotos individuales/apiladas, persistencia y comprobación de los bordes del video exportado.

Se mantiene React + Vite y la composición con una, dos o tres fotos. Se retiran las dependencias de IA, servidor y efectos que no se usaban, junto con los archivos de plantilla de AI Studio y el lockfile de Bun desactualizado.

Commit sugerido: "feat: add photo framing and batch rotation, improve video export"


Para probar también la compilación de producción: primero ejecutá browser-smoke.cjs para generar las fotos de prueba; luego mantené npm run preview activo en otra terminal y ejecutá node scripts/production-smoke.cjs y node scripts/restoration-smoke.cjs. Se comprueban música WAV cargada, transición Wipe, descarga de video desde el modal, inspector XML, montaje automático con 31 fotos y diseño a 390/320 píxeles. Con npm run dev activo, node scripts/transitions-smoke.cjs verifica los colores de Fade/Wipe/Pan, márgenes y controles guardados. Verificá VERIFICACION.md para conocer el alcance de la entrega.

Con npm run preview activo en el puerto 4173, **node scripts/fit-smoke.cjs** genera sus propias fotos de prueba y comprueba la función de rellenar, sin depender de las otras pruebas de navegador.

**node scripts/optimization-smoke.cjs**, con npm run preview activo, comprueba reproducción continua mientras editás, caché de fotos, ausencia de animación estando pausada, carga diferida de herramientas, compatibilidad de Fade y móviles. **node scripts/progress-smoke.cjs** verifica el avance de carga y reconexión de 31 fotos. Ver [OPTIMIZACIONES.md](OPTIMIZACIONES.md) para los cambios y mediciones.

## Entrada de quince y clips

Entrada usa la canción completa: fotos a duración fija al principio, golpes desde un segundo elegido y aceleración desde el contador de 5 o 10 hasta 0. Repite las fotos en ciclo y permite corregir los cortes detectados. También admite clips locales en las escenas, con inicio ajustable y sin audio propio. Consultá [uso y verificación](ENTRADA-Y-CLIPS.md).

En Música y Entrada podés recortar una canción con dos marcadores sobre su forma de onda y escuchar automáticamente cada punto. Entrada dura el tramo elegido; en montajes normales la selección se repite para acompañar las escenas. Encuadre ahora comparte giros y movimientos para ambos modos.

# AutoReel Studio

Editor de fotos a video para fotógrafos. React 19, TypeScript, Vite y Tailwind CSS. Funciona como aplicación estática en Vercel; las fotos y la música se procesan en el navegador.

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

1. Descomprimí el ZIP.
2. Creá un repositorio en GitHub.
3. Subí el contenido de la carpeta autoreel-studio a la raíz del repositorio. Incluí src, public, tests, scripts, package.json, package-lock.json, tsconfig.json, vite.config.ts, vercel.json y README.md.
4. No subas node_modules, dist, artifacts ni archivos .env. El .gitignore ya los excluye.

También podés abrir esta carpeta con GitHub Desktop y publicar el repositorio. El ZIP contiene código fuente; no se debe subir el ZIP como único archivo del repositorio.

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

## Flujo de uso

1. Elegí fotos individuales o una carpeta completa.
2. Para Premiere, pegá la ruta absoluta de esa carpeta, por ejemplo D:\Fotos\Sesion o /Users/usuario/Fotos/Sesion. El navegador no puede obtener esta ruta.
3. Pegá la selección del cliente: números, nombres, códigos de cámara o rangos. Ejemplo: 004, 012, 025-028, DSC_1020.jpg.
4. Pulsá Aplicar selección. Si hay fotos faltantes o nombres ambiguos, se muestra el problema y se conserva el montaje anterior. También podés usar todas las fotos.
5. Elegí formato, estilo, duración, música y textos. Los presets Boda, Fiesta, Portfolio e Inmobiliaria ajustan estilo y ritmo.
6. Reagrupar montaje aplica el apilado de fotos horizontales en pares o tríos. Reemplaza la distribución de escenas: aplicalo antes de hacer ajustes individuales.
7. En Línea de tiempo, cambiá el orden, duración, transición y movimiento. Elegir un diseño con más fotos consume fotos de escenas siguientes; elegir una foto por escena divide el grupo sin perder fotos.
8. Grabá el video final o descargá el XML para Premiere.
9. Usá Guardar proyecto JSON para llevarte el montaje. Nuevo proyecto descarga un respaldo del anterior antes de abrir una sesión vacía.

Aplicar selección reconstruye las escenas a partir del texto y de la duración configurada. Editar el texto o el modo de agrupación solo no altera el montaje hasta que se aplican. Cambiar la duración general actualiza todas las escenas.

La búsqueda intenta primero el nombre exacto, sin distinguir mayúsculas. Si la entrada era un número, también busca el número al final de los nombres reales. Un nombre de archivo explícito nunca se sustituye por otro prefijo. Evitá pegar fechas, teléfonos u otros números ajenos a la selección.

Al elegir una carpeta se conserva la estructura de subcarpetas debajo de su raíz. Para reconectar un proyecto, elegí la misma carpeta raíz. Si hay nombres repetidos en subcarpetas, usá un conjunto de archivos sin nombres ambiguos o elegí esas fotos individualmente.

## Fotos y música

- Fotos: JPG, JPEG, PNG, WebP y AVIF; hasta 400 archivos por biblioteca, 50 MB por foto y 100 megapíxeles por imagen.
- RAW y HEIC: convertí a JPG o PNG antes de cargarlos.
- Se preparan copias locales de hasta 1920 píxeles en su lado largo para reducir memoria. El XML referencia los archivos originales con sus dimensiones originales.
- Audio: música sintética integrada o un archivo de audio compatible con el navegador, hasta 50 MB. La música cargada reemplaza la sintética y se repite si es más corta que el montaje.
- Sin música elimina el audio del montaje. El control Silenciar afecta la escucha de la vista previa; la exportación usa el volumen configurado.
- Para sesiones grandes, la memoria y la velocidad dependen de tu computadora. Dividí el trabajo en montajes cortos si el navegador se queda sin memoria.
- No se suben fotos, audio ni proyectos a un servidor. No hay llamadas a servicios de IA ni fuentes externas.

## Exportación de video

La aplicación elige MP4 con H.264/AAC cuando MediaRecorder lo admite. Si no está disponible, ofrece WebM y muestra el formato antes de grabar. Recomendamos Chrome o Edge actualizado en una computadora.

Se graba en tiempo real, hasta 5 minutos, con la resolución y FPS configurados. Mantené la pestaña visible; ocultarla cancela la grabación para evitar un archivo incompleto. La cadencia real depende de la capacidad de codificación de tu equipo. Podés cancelar la grabación.

El video incluye fotos apiladas, fondos, movimientos, transiciones, títulos, marca de agua y audio. No cambia la extensión de un WebM para hacerlo pasar por MP4.

## Premiere: alcance del XML

El XML de intercambio xmeml contiene los originales, rutas, orden, duración y pistas simultáneas para escenas con dos o tres fotos. Incluye escala y posición básicas.

**No incluye los fondos difuminados, textos, música, transiciones ni animaciones del navegador.** Verificá escala y posición en tu versión de Premiere. Para conservar todo el diseño, descargá el video final e importalo como un clip.

En Premiere: Archivo → Importar → elegí el XML. Los originales deben existir en la ruta local indicada; si se movieron, usá la vinculación de medios de Premiere.

El inspector lee XML de intercambio xmeml exportado desde Premiere y respeta tiempos de línea de tiempo y pistas simultáneas. Para un .prproj nativo, primero exportá Archivo → Exportar → Final Cut Pro XML. No se inventan clips ni versiones de Premiere cuando un archivo no puede interpretarse. FCPXML y límites de transición especiales con start/end -1 muestran un error descriptivo.

No se genera un ExtendScript incompleto ni se promete ejecutar Premiere desde el navegador.

## Guardado y privacidad

El montaje se guarda automáticamente en localStorage de este navegador y dominio, con una versión de formato. El JSON conserva configuración, escenas, selección, nombres y rutas, pero **no incluye las fotos ni la música**.

Al recargar o abrir un JSON, volvé a elegir la carpeta de fotos y el audio. Las URLs temporales de archivos no se guardan. El guardado local no sincroniza entre dispositivos ni entre diferentes URLs de Vercel. Descargá JSON para tener un respaldo portátil.

El JSON incluye rutas de archivos de tu computadora y textos del evento. Revisalo antes de compartirlo o publicarlo en un repositorio. El editor no necesita guardar datos de clientes en GitHub.

## Google Drive

El campo de Drive guarda un enlace de referencia y permite abrirlo. Para usar las fotos, descargá o sincronizá la carpeta con Drive para escritorio y elegila desde tu computadora. Esta versión no implementa OAuth ni acceso directo a carpetas privadas de Google.

## Pruebas y verificación

npm test ejecuta 16 pruebas de regresión: extracción y deduplicación de selecciones, códigos de cámara, coincidencias ambiguas, rangos, agrupación, rutas, XML y validación del guardado. npm run build también verifica TypeScript en modo estricto.

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
3. Reproducí el montaje y escuchá la música.
4. Grabá un video corto; verificá resolución, duración, textos y audio.
5. Exportá el XML e importalo en Premiere en la misma computadora donde están los originales.
6. Recargá la página: el montaje debe conservarse y pedir reconectar las fotos.
7. Revisá la consola del navegador y que Vercel haya completado el build.

La entrega fue verificada localmente; el despliegue en tu cuenta y la importación real en Adobe Premiere requieren estas comprobaciones.

## Estructura y cambios

- src/App.tsx: estado persistente del proyecto, conexión de archivos y edición de escenas.
- src/components: formularios conectados, vista previa, línea de tiempo y ventanas accesibles.
- src/utils/photoParser.ts: selección sin fotos de stock ni archivos inventados.
- src/utils/importPhotos.ts: lectura local, orientación real, preparación de imágenes y limpieza de recursos.
- src/utils/canvasRenderer.ts: motor visual compartido por vista previa y grabación.
- src/utils/videoRecorder.ts y audioSynthesizer.ts: video en tiempo real y mezcla de audio.
- src/utils/projectStorage.ts: JSON versionado, validación y recuperación del proyecto.
- src/utils/premiereParser.ts y premiereXmlGenerator.ts: intercambio XML sin datos simulados.
- package.json y package-lock.json: dependencias reducidas e instalación reproducible.
- vite.config.ts, tsconfig.json y vercel.json: configuración de desarrollo, TypeScript y Vercel.
- tests/core.test.ts: pruebas de los casos que fallaban en la versión anterior.

Se mantiene React + Vite y la composición con una, dos o tres fotos. Se retiran las dependencias de IA, servidor y efectos que no se usaban, junto con los archivos de plantilla de AI Studio y el lockfile de Bun desactualizado.

Commit sugerido: "fix: connect real photos, persist edits and correct video export"


Para probar también la compilación de producción: primero ejecutá browser-smoke.cjs para generar las fotos de prueba; luego mantené npm run preview activo en otra terminal y ejecutá node scripts/production-smoke.cjs. Se comprueba música WAV cargada, descarga de video desde el modal e inspección del XML generado. Verificá VERIFICACION.md para conocer el alcance de la entrega.

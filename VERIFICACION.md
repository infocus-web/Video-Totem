# Verificación de la entrega

Fecha: 11 de octubre de 2026.

## Resultado

- Instalación limpia con npm ci: correcta.
- npm audit: 0 vulnerabilidades reportadas en las dependencias instaladas.
- TypeScript estricto y compilación Vite de producción: correctos.
- Pruebas automatizadas: 16 aprobadas, 0 fallidas.
- Flujo de navegador verificado en Google Chrome de escritorio.

## Evidencia de navegador

- Fotos locales reales de prueba: cargadas y seleccionadas por número.
- Rangos, deduplicación, nombres explícitos y coincidencias ambiguas: cubiertos por pruebas.
- Orden y duración editados: conservados en JSON y al reconectar fotos después de recargar.
- XML generado: 5 clips en 2 pistas, 5,2 segundos de secuencia, sin sumar dos veces los clips simultáneos.
- XML inválido: rechazado con error.
- MP4 grabado: 1080 × 1920, aproximadamente 1,97 segundos para un montaje de 2 segundos, con 1 pista de audio.
- Segunda grabación consecutiva: correcta.
- Música WAV cargada: decodificada y usada en la exportación desde el modal.
- Compilación de producción: carga de fotos, grabación, descarga XML e inspector verificados.
- Ventanas: cierre con Escape verificado.
- Nuevo proyecto: descarga de respaldo JSON verificada.
- Móvil: ancho de página de 390 píxeles en una pantalla de 390 píxeles, sin desbordes.
- Consola: sin errores en los flujos probados.

## Alcance pendiente fuera del entorno local

No se publicó un repositorio ni se desplegó en una cuenta de Vercel. La configuración y el código están preparados para hacerlo siguiendo README.md.

La importación del XML dentro de Adobe Premiere no se ejecutó. El inspector del navegador verificó la estructura y tiempos del XML generado; escala y posición requieren una comprobación en la versión de Premiere del usuario. Los efectos completos del editor se conservan en el video, no en el XML.

La exportación MP4 depende de los codecs que admita el navegador. Existe alternativa WebM y se muestra el formato antes de grabar.

## Cambios funcionales relevantes

Se conservan React + Vite, fotos individuales, escenas de dos o tres fotos horizontales, línea de tiempo y presets.

La biblioteca usa fotos locales en lugar de imágenes de stock. Los nombres y controles de configuración están conectados. El estado de escenas ya no se pierde por recalcular automáticamente el montaje.

Drive se usa mediante descarga o sincronización local, con un enlace de referencia. Los proyectos nativos .prproj se convierten a XML de intercambio desde Premiere antes de inspeccionarlos. La interfaz y la documentación declaran estas limitaciones.

Las fotos se preparan como copias locales de hasta 1920 píxeles en su lado largo. El XML sigue vinculando los originales.

El guardado local y los JSON contienen configuración y referencias a archivos, sin incluir fotos ni audio. Requieren reconexión al reabrir.


# Verificación de la entrega

Fecha: 11 de octubre de 2026.

## Resultado

- Instalación limpia con npm ci: correcta.
- npm audit: 0 vulnerabilidades reportadas en las dependencias instaladas.
- TypeScript estricto y compilación Vite de producción: correctos.
- Pruebas automatizadas: 17 aprobadas, 0 fallidas.
- Flujo de navegador verificado en Google Chrome de escritorio.

## Evidencia de navegador

- Fotos locales reales de prueba: cargadas y seleccionadas por número.
- Rangos, deduplicación, nombres explícitos y coincidencias ambiguas: cubiertos por pruebas.
- Orden y duración editados: conservados en JSON y al reconectar fotos después de recargar.
- XML generado: 5 clips en 2 pistas, 5,2 segundos de secuencia, sin sumar dos veces los clips simultáneos.
- XML inválido: rechazado con error.
- MP4 grabado: 1080 × 1920, aproximadamente 2,01 segundos para un montaje de 2 segundos, con 1 pista de audio.
- Segunda grabación consecutiva: correcta.
- Música WAV cargada: decodificada y usada en la exportación desde el modal.
- Compilación de producción: carga de fotos, grabación, descarga XML e inspector verificados.
- Ventanas: cierre con Escape verificado.
- Nuevo proyecto: descarga de respaldo JSON verificada.
- Diseño del editor recuperado de Google AI Studio, con tarjetas y vista previa en marco de teléfono.
- Importación de 31 fotos con selección vacía: montaje automático, sin necesidad de aplicar una selección para empezar.
- Tarjetas de agrupación 2/3/individual, separación, nombres y portapapeles real: verificadas.
- Transiciones globales e individuales: Wipe y Fade conservadas en JSON y después de recargar y reconectar fotos.
- Píxeles de Wipe: foto siguiente a la izquierda y actual a la derecha; márgenes reemplazados sin restos.
- Píxeles de Fade: mezcla al 50% de ambas escenas, igual a la disolvencia. Pan: desplazamiento de escenas sin duplicados.
- Última escena: termina sin aplicar una transición hacia la primera.
- Compilación de producción: grabación con Wipe y música WAV, descarga MP4 e importación en el inspector XML correctas.
- Móvil: editor y línea de tiempo sin desbordes a 390 y 320 píxeles.
- Consola: sin errores en los flujos probados.

## Alcance pendiente fuera del entorno local

Esta entrega no modificó el repositorio Video-Totem ni su despliegue existente. La configuración y el código están preparados para actualizarlo siguiendo README.md. Las pruebas nuevas corresponden al código local de este ZIP.

La importación del XML dentro de Adobe Premiere no se ejecutó. El inspector del navegador verificó la estructura y tiempos del XML generado; escala y posición requieren una comprobación en la versión de Premiere del usuario. Los efectos completos del editor se conservan en el video, no en el XML.

La exportación MP4 depende de los codecs que admita el navegador. Existe alternativa WebM y se muestra el formato antes de grabar.

## Cambios funcionales relevantes

Se conservan React + Vite, fotos individuales, escenas de dos o tres fotos horizontales, línea de tiempo y presets.

La biblioteca usa fotos locales en lugar de imágenes de stock. Los nombres y controles de configuración están conectados. Las tarjetas de apilado redistribuyen el montaje conservando orden y movimientos; cada grupo usa los ajustes de su primera foto. Los demás controles mantienen las escenas editadas, salvo Aplicar selección y Usar todas las fotos, que reconstruyen el montaje explícitamente.

Drive se usa mediante descarga o sincronización local, con un enlace de referencia. Los proyectos nativos .prproj se convierten a XML de intercambio desde Premiere antes de inspeccionarlos. La interfaz y la documentación declaran estas limitaciones.

Las fotos se preparan como copias locales de hasta 1920 píxeles en su lado largo. El XML sigue vinculando los originales.

El guardado local y los JSON contienen configuración y referencias a archivos, sin incluir fotos ni audio. Requieren reconexión al reabrir.

Veo se omitió por pedido del usuario. No hay componentes de generación con IA, rutas API de Veo, dependencias de Gemini ni servidor Express en esta entrega. No requiere claves ni variables de entorno.


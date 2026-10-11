# Verificación de la entrega

Fecha: 11 de octubre de 2026.

## Resultado

- Instalación limpia con npm ci: correcta.
- npm audit: 0 vulnerabilidades reportadas en las dependencias instaladas.
- TypeScript estricto y compilación Vite de producción: correctos.
- Pruebas automatizadas: 22 aprobadas, 0 fallidas.
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

## Verificación del relleno sin márgenes

- Mostrar foto completa y Rellenar cuadro: conservan proporciones y cambian el encuadre visible.
- Foto individual y apilados de 2 y 3 fotos: bordes superior e inferior cubiertos, comprobados por píxeles.
- Separación 0px: disponible para quitar la línea entre fotos apiladas.
- Movimiento vertical: limitado al excedente de la imagen para evitar franjas.
- Guardado JSON, recarga y reconexión: conservan el relleno. Los JSON anteriores conservan el modo de foto completa.
- Vista previa: se actualiza cuando termina la decodificación de las fotos, sin depender de tocar Reproducir.
- Video MP4 sin música: 1080 × 1920, 1,492 segundos para un montaje de 1,5 segundos; bordes superior e inferior cubiertos. Incluye una pista de audio silenciosa para mantener estable el codificador.
- Video con música WAV y Wipe, descarga XML e inspector: verificados después del ajuste de captura.
- Editor sin desbordes a 390 y 320 píxeles; consola sin errores.
- Instalación limpia, TypeScript, build y 18 pruebas: correctos. No se agregaron dependencias.

Los cambios abarcan los tipos y valores iniciales del encuadre, su persistencia, el renderizador, los controles y la ayuda, la actualización de la vista previa, el grabador, las pruebas y esta documentación. El XML base conserva la foto completa; el recorte se aplica al video final.

## Alcance pendiente fuera del entorno local

Los archivos optimizados se aplican directamente al repositorio local **D:\PROYECTOS\VIDEO TOTEM\Video Totem**. No se publica un commit ni se modifica el despliegue desde esta entrega. Para actualizar Vercel, revisá los cambios en GitHub Desktop, hacé commit y Push origin.

La importación del XML dentro de Adobe Premiere no se ejecutó. El inspector del navegador verificó la estructura y tiempos del XML generado; escala y posición requieren una comprobación en la versión de Premiere del usuario. Los efectos completos del editor se conservan en el video, no en el XML.

La exportación MP4 depende de los codecs que admita el navegador. Existe alternativa WebM y se muestra el formato antes de grabar.

## Optimización y continuidad de reproducción

- Cambiar textos, volumen, FPS, recorte, separación, transición, movimiento, duración, orden y agrupación mantiene la reproducción.
- Con tres fotos, importar y preparar la vista previa requiere seis decodificaciones. Los ajustes no agregan decodificaciones. Agregar una foto nueva requiere dos más, sin volver a decodificar las anteriores.
- Vista previa pausada: cero callbacks de animación durante el intervalo medido de 350 ms.
- Línea de tiempo, exportación, inspector y ayuda se descargan al abrirlos. Un inspector ya abierto conserva sus datos al cerrarlo.
- Un solo acceso a inspector y ayuda; grabación centralizada en Exportar; un selector de transición por escena; Fade y disolvencia unificados visualmente como Fundido, con compatibilidad del JSON anterior.
- Rutas de Premiere y Reagrupar disponibles en secciones desplegables. Los presets describen los ajustes que aplican.
- Carga de 31 fotos, progreso real, reconexión y recuperación ante archivo inválido comprobados.
- El archivo exportado se verifica antes de descargar. Un MP4 sin pista de video se descarta y se reintenta como WebM. La prueba corta con música WAV comprobó resolución y duración del video resultante.
- Se conserva el recorte individual/apilado y se comprueban los píxeles superior e inferior del video exportado.
- Documentación de archivos y mediciones: OPTIMIZACIONES.md.

## Cambios funcionales relevantes

Se conservan React + Vite, fotos individuales, escenas de dos o tres fotos horizontales, línea de tiempo y presets.

La biblioteca usa fotos locales en lugar de imágenes de stock. Los nombres y controles de configuración están conectados. Las tarjetas de apilado redistribuyen el montaje conservando orden y movimientos; cada grupo usa los ajustes de su primera foto. Los demás controles mantienen las escenas editadas, salvo Aplicar selección y Usar todas las fotos, que reconstruyen el montaje explícitamente.

Drive se usa mediante descarga o sincronización local, con un enlace de referencia. Los proyectos nativos .prproj se convierten a XML de intercambio desde Premiere antes de inspeccionarlos. La interfaz y la documentación declaran estas limitaciones.

Las fotos se preparan como copias locales de hasta 1920 píxeles en su lado largo. El XML sigue vinculando los originales.

El guardado local y los JSON contienen configuración y referencias a archivos, sin incluir fotos ni audio. Requieren reconexión al reabrir.

Veo se omitió por pedido del usuario. No hay componentes de generación con IA, rutas API de Veo, dependencias de Gemini ni servidor Express en esta entrega. No requiere claves ni variables de entorno.


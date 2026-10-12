# Entrada de quince y clips locales

## Uso

### Prueba musical con vista previa sincronizada

**Escuchar**, **Espacio** y **Autoescucha** ahora muestran el montaje mientras suena la canción: fotos, movimientos, clips sin sonido y contador usan el instante del audio. Mover el cursor musical también muestra ese fotograma, incluso con Autoescucha desactivada. Al pausar, terminar la prueba o cambiar de panel, la imagen queda detenida. La reproducción normal de la vista previa puede retomarse desde ese instante.

El reloj de audio dirige el render sin iniciar una segunda canción. Se resta el inicio del recorte para convertir los segundos de la canción a segundos del video; Entrada respeta los cortes al golpe y la aceleración del contador. La prueba sigue limitada a tres segundos al mover el cursor, y Escuchar continúa hasta el final del tramo. Cambiar de panel sigue deteniendo la prueba.

Archivos modificados: `src/components/MusicTimeline.tsx` publica posición y estado de la escucha; `src/App.tsx`, `src/components/ClientInputPanel.tsx` y `src/components/EntranceControls.tsx` conectan esos eventos; `src/components/VideoPreviewPlayer.tsx` dibuja el instante correcto y comparte pausa con el audio; `scripts/audition-preview-smoke.cjs` verifica sincronización y contador en Chrome; `scripts/music-trim-smoke.cjs` espera reproducción visual durante Autoescucha y elige explícitamente la primera foto antes de girarla. Este documento explica el uso y las pruebas. Sin dependencias nuevas ni cambios al formato del proyecto.

Pruebas: 68 tests de lógica, TypeScript y build; prueba de Chrome de búsqueda con recorte, cambio de fotos al golpe, contador 5 → 0, pausa, Espacio, Autoescucha y salida del panel; regresión de Chrome con recorte, giro, movimiento, JSON y exportación MP4 de Entrada y montaje normal.

Para probar localmente: `npm run dev`, abrir Entrada con fotos y canción, colocar el contador y mover el cursor musical cerca de ese segundo; usar Escuchar y Espacio, comprobar contador y cambios de fotos, pausar y verificar que ambos se detienen. Repetir con un inicio musical recortado. Para producción: hacer Commit/Push, esperar el deploy de Vercel y recargar; repetir el flujo en la web. El cambio solo afecta la vista previa durante pruebas de audio, sin modificar los originales ni los tiempos de exportación.

### Reconexión automática de originales

En Chrome/Edge compatibles, **Fotos / clips**, **Carpeta** y **Cargar** abren el selector nativo y recuerdan los accesos de lectura. Se conserva únicamente el handle de cada archivo usado y el identificador del proyecto, en IndexedDB. No se guardan copias de multimedia ni se suben archivos a Vercel. La selección de carpeta continúa preparando solo los archivos de la lista, cuando la hay.

Al recargar, reiniciar el navegador o abrir el JSON del mismo proyecto en este navegador/dominio, la app consulta el permiso y reconecta los archivos vinculados. Conserva escenas, giros, encuadres, movimientos, recorte y contador. Si falta permiso, **Reconectar originales** lo solicita mediante un clic; Chrome puede ofrecer **Permitir en cada visita**. La app nunca solicita permiso automáticamente ni escritura sobre los originales. Si un archivo cambió de ubicación o fue borrado, informa cuál falta. Si cambió el contenido de la canción, pide elegirla para revisar la sincronización.

Los archivos elegidos antes de esta función, o mediante el selector antiguo, deben elegirse una vez con los nuevos botones. El JSON mantiene compatibilidad con proyectos anteriores y recibe un identificador local al abrirse. Los handles no se exportan en JSON ni viajan a otros equipos, perfiles o dominios. Un proyecto nuevo tiene sus propios vínculos y no conecta los del anterior; Quitar música elimina su vínculo. Borrar los datos del sitio elimina estos accesos guardados. Los navegadores sin File System Access siguen usando la reconexión manual.

Archivos: `src/utils/localFileLinks.ts` gestiona los selectores, handles, permisos y recuperación; `src/components/LocalFilePicker.tsx` presenta los botones con selección manual compatible; `src/App.tsx` integra importación y reconexión; `src/utils/projectStorage.ts` conserva el identificador local; `src/components/ClientInputPanel.tsx` y `src/components/EntranceControls.tsx` comparten los selectores. `README.md`, este documento y `src/components/FaqGuideModal.tsx` explican el nuevo flujo. `scripts/local-links-smoke.cjs` prueba la reconexión; `scripts/music-trim-smoke.cjs` y `scripts/entrance-clips-smoke.cjs` usan selectores exactos para distinguir el botón nativo del campo compatible, y la prueba musical posiciona la escucha antes de reproducir el recorte.

Verificación local: `npm test`, `npm run build` y `scripts/local-links-smoke.cjs`. La prueba de Chrome usa handles reales de un directorio de prueba del navegador, reemplaza el selector nativo para automatizarlo y simula la pérdida de permiso; comprueba selección, fotos/clips/música tras reiniciar Chrome, edición y JSON, faltantes y aislamiento de proyectos. Para comprobar el selector del disco y los permisos reales, elegí tus originales, recargá, cerrá/reabrí Chrome y probá Reconectar originales si aparece. Repetí después de Commit, Push y deploy en Vercel, usando siempre el mismo dominio. No se agregaron dependencias.

### Recortar música y escuchar el corte

En **Música** y **Entrada**, cargá una canción para ver su forma de onda. Arrastrá el marcador violeta de inicio y el amarillo de final, o ajustá los segundos en los campos. El deslizador inferior permite escuchar desde cualquier posición. Con **Autoescucha**, mover el inicio reproduce hasta tres segundos desde ese punto; mover el final reproduce los dos segundos anteriores al corte. **Escuchar** reproduce toda la selección, **Pausa** la detiene y **Toda** restaura la canción completa. La escucha del corte pausa la vista previa para que no se mezclen dos reproducciones.

En Entrada, el video dura exactamente el tramo seleccionado. Los tiempos de **Golpes desde**, los cortes y el contador indican segundos de la canción original; el reloj del video empieza en cero. Ejemplo: música de 20 a 80, golpes desde el 40 y contador 10 al final: el MP4 dura 60 s, sigue los golpes desde el segundo 20 del video y cuenta de 10 a 0 en sus últimos diez segundos. El contador requiere un tramo de al menos cinco o diez segundos. En un montaje normal, el recorte no cambia la duración de las escenas: la música seleccionada se repite si hace falta.

Los marcadores se guardan en el JSON y se conservan al reconectar el mismo audio. Una canción distinta restaura el tramo completo y limpia sus golpes. Las escuchas se detienen al cambiar de panel, cargar otro archivo o comenzar la exportación. No se modifica ni sobrescribe el archivo de música original.

### Herramientas compartidas para Entrada

**Barra espaciadora** alterna Play/Pausa de la canción en Música y Entrada. Reanuda desde la posición de escucha dentro del recorte; al terminar vuelve a arrancar desde el inicio seleccionado. También funciona después de mover un deslizador. No actúa mientras escribís en un campo ni dentro de una ventana modal. El botón **Escuchar** usa el mismo comportamiento.

El bloque **Contador**, justo debajo de la música, reúne 5/10 → 0, **Empezar en**, el deslizador **Momento** y Opacidad. Para fijarlo al oído, posicioná o reproducí la canción y tocá **Contador aquí**; también podés arrastrar su marcador rosa sobre la forma de onda. Los segundos son de la canción original, y el bloque muestra dónde comienza dentro del video recortado. Se limita para que la cuenta termine dentro de la música. Si lo adelantás antes del inicio de golpes, ese inicio se adelanta al mismo segundo. **Al final** recupera el contador en los últimos cinco/diez segundos.

Archivos: `MusicTimeline.tsx` agrega el atajo y el marcador; `EntranceControls.tsx` reúne y sincroniza los controles del contador; `index.css` distingue el bloque rosa. Para probar localmente y en Vercel después del deploy: Espacio, pausa, Espacio para reanudar; luego Contador aquí y verificá el segundo en Empezar en. Probá también arrastrar el marcador, escribir un segundo y guardar/reabrir el JSON.

La línea de tiempo musical tiene **Zoom** de 1× a 32× y también responde a la rueda del mouse sobre la forma de onda. El zoom mantiene el segundo bajo el puntero; el deslizador mantiene el centro visible. Usá la barra horizontal o **Shift + rueda** para recorrer el tema ampliado, y **Ajustar** para ver toda la canción. Cambia únicamente la vista: no mueve los cortes, ni altera el audio o la duración. Está disponible en Música y Entrada. Archivos: `src/components/MusicTimeline.tsx` y `src/index.css`. Para probar localmente y después del deploy, ampliá, desplazate, arrastrá un marcador y comprobá la autoescucha; ajustá la vista y verificá que los límites se mantengan.

El botón **Giro, encuadre y movimientos** de Entrada abre **Encuadre**. Ahí tenés posición, zoom, giro de 90°, giro inteligente y **Movimiento**: Fija, Acercar, Alejar, Subir y Bajar. El selector **Aplicar a** permite editar la foto actual, las marcadas o todas. Tocá **Listo** para volver a reproducir. Los movimientos avanzan dentro del intervalo real de cada foto de Entrada y vuelven a empezar en cada repetición. Cuando una foto dura un solo fotograma, no hay tiempo para mostrar un desplazamiento entre cuadros. Los cambios al golpe y durante el contador siguen siendo cortes directos para conservar la sincronización.

Archivos de este ajuste: `MusicTimeline.tsx` y `index.css` agregan la forma de onda y los controles; `musicTrim.ts`, `types/index.ts` y `projectStorage.ts` guardan y validan el recorte; `audioSynthesizer.ts`, `videoEncoder.ts` y `videoRecorder.ts` usan los límites al escuchar y exportar. `App.tsx`, `ClientInputPanel.tsx`, `EntranceControls.tsx` y `VideoPreviewPlayer.tsx` integran la escucha y la duración. `entrance.ts` conserva la sincronización y habilita los movimientos; `PhotoFramingControls.tsx` y `projectConfig.ts` comparten la edición por selección. `tests/music-trim.test.ts` verifica tiempos, ciclos de música, movimientos y JSON; `scripts/music-trim-smoke.cjs` prueba los marcadores con el mouse, autoescucha, giro, movimiento y MP4 de Entrada y de montaje normal.

Para probar localmente, cargá la canción, elegí un inicio y final reconocibles, escuchá ambos cortes y exportá. Confirmá que el MP4 empiece donde marcaste, dure el tramo elegido en Entrada y mantenga contador, giros y movimientos. Guardá/reabrí el JSON y reconectá el mismo audio. En Vercel repetí la prueba después de Commit, Push y deploy. No se agregaron dependencias.

1. En **Fotos**, cargá fotos y/o clips MP4, WebM o MOV. Podés mezclarlos en escenas individuales, pares o tríos. Fotos admite 50 MB por archivo; clips, 200 MB. El límite sigue siendo 400 archivos. Usá MP4 H.264 si el navegador no puede decodificar un clip.
2. En **Encuadre**, los clips tienen los mismos controles de posición, zoom y giro. **Inicio del clip** elige desde dónde reproducirlo. Se repite desde ese punto cuando la escena dura más que el tramo restante. Los clips se reproducen sin sonido propio; se usa la música del proyecto.
3. En **Entrada**, activá el modo para pantalla gigante. Configura 1920 × 1080, sin giro de salida y 60 FPS. Mantiene tus escenas, orden y encuadres como fuentes; las repite en ciclo.
4. Cargá la canción: por defecto el video empieza desde cero y dura todo el tema. Podés cambiarlo con los marcadores de recorte. **Segundos por foto** define la duración fija inicial (por ejemplo, 2 s). **Golpes desde (s)** elige cuándo empezar a seguir la música (por ejemplo, segundo 30). **Contador → Desde (s)** elige cuándo empezar a acelerar, con cuenta de 5 → 0 o 10 → 0. **Al final** ubica automáticamente el contador en los últimos 5/10 segundos. Ejemplo: una canción de 180 s, fotos cada 2 s hasta el segundo 30, golpes del 30 al 170, contador de 10 del 170 al 180. El MP4 dura 180 s.
5. Tocá **Detectar**. El análisis local identifica ataques, priorizando el bombo. **Cada 1/2/4/8** cambia con esa cantidad de golpes; **Desfase** adelanta o retrasa los cortes. **Cortes** permite editar segundos absolutos, con punto decimal y separados por coma; tocá **Aplicar**.
6. Durante el contador, las escenas aceleran progresivamente desde el ritmo anterior hasta una por fotograma. A 60 FPS, el mínimo visible es 1/60 s (16,7 ms). Si el cero coincide con el final del tema, aparece en el último cuadro, sin agregar silencio ni alargar el video. Si el contador termina antes, el cero se sostiene un segundo dentro de la canción y luego desaparece; las escenas siguen en ciclo a velocidad máxima hasta que termina la música.
7. Exportá el MP4. Los cuadros, clips, contador y música usan el mismo cronograma. La codificación puede tardar más que la duración del video; no saltea cuadros para terminar antes. Entrada y clips requieren Chrome/Edge con codificación por cuadros, sin recurrir a una grabación que altere los tiempos.

**Opacidad**, en Entrada, ajusta el contador de 0% (oculto) a 100% (visible), incluyendo el fondo oscuro que lo acompaña. Se ve al instante en la vista previa, se conserva en el MP4 y se guarda en el proyecto. No modifica los tiempos ni la aceleración. Los proyectos anteriores mantienen 100%.

Archivos del ajuste de opacidad: `src/components/EntranceControls.tsx` agrega el deslizador; `src/types/index.ts` y `src/utils/entrance.ts` guardan el valor y mantienen compatibilidad; `src/utils/canvasRenderer.ts` aplica la transparencia compartida por vista previa y exportación. Para verificarlo localmente, buscá un segundo donde aparezca el contador y compará 0%, 50% y 100%; guardá/reabrí el JSON y exportá. En producción, repetí la prueba después de Commit, Push y deploy en Vercel.

El detector de golpes es una ayuda de edición: canciones con ataques suaves, voces o ritmos complejos pueden necesitar correcciones manuales. La línea de tiempo conserva las escenas fuente; los cortes de Entrada se ajustan en su panel. El XML de Premiere conserva la secuencia base y no representa el contador ni la repetición acelerada. En escenas con clips, el XML base tampoco representa su inicio ni repetición; usá MP4 para conservar esos ajustes.

Los proyectos JSON guardan tiempos, cortes y encuadres, pero no fotos, clips ni canciones. En el navegador/dominio donde vinculaste los originales, se reconectan automáticamente si Chrome conserva el permiso. En otro entorno, elegí los mismos archivos. La huella SHA-256 de la canción permite conservar los cortes ajustados al reconectar el mismo audio; una canción distinta elegida manualmente limpia los golpes anteriores para evitar una sincronización incorrecta.

## Cambios de código

- `EntranceControls.tsx`: panel Entrada, duración fija inicial, segundo de sincronización y contador programable, detector cancelable, desfase y cortes manuales.
- `entrance.ts`: selección cíclica, cortes alineados a fotogramas, aceleración y validaciones, sin multiplicar las escenas guardadas.
- `beatDetection.ts` / `beatDetection.worker.ts`: detección de ataques fuera del hilo de interfaz, sin dependencias ni llamadas a servicios.
- `clipMedia.ts`, `previewClips.ts`, `clipFrames.ts`: importación, reproducción local y decodificación precisa de clips. Se usa [CanvasSink de Mediabunny](https://mediabunny.dev/api/CanvasSink), una dependencia que el proyecto ya tenía.
- `App.tsx`, `ClientInputPanel.tsx`, `PhotoFramingControls.tsx`, `VideoPreviewPlayer.tsx`: integración de Entrada y clips con carga, encuadre, vista previa y duración total.
- `audioSynthesizer.ts`: desplazamiento de música en reproducción y exportación, y huella de archivo para reconexión.
- `canvasRenderer.ts`, `videoEncoder.ts`, `videoRecorder.ts`, `recordingImages.ts`: contador y clips en MP4, con generación determinista y recursos acotados a escenas necesarias.
- `types/index.ts`, `projectStorage.ts`, `projectConfig.ts`, `reconnectPhotos.ts`, `photoFiles.ts`, `photoParser.ts`: metadatos de clips, inicio, selección y proyectos antiguos compatibles.
- `ExportModal.tsx`, `FaqGuideModal.tsx`, README y documentación: alcance de exportación y uso.
- `tests/entrance.test.ts`, `scripts/entrance-clips-smoke.cjs`, `scripts/workspace-layout-smoke.cjs`: verificación del comportamiento nuevo y actualización de navegación a nueve paneles.

## Verificación local y producción

Desde la carpeta del proyecto:

```powershell
npm test
npm run build
npm run dev
```

Abrí la app local y repetí el flujo anterior con tus fotos y canción. Verificá los golpes en reproducción y revisá el MP4 en un reproductor. Los modelos existentes de Giro inteligente se conservan; no se agregaron dependencias para esta función.

Para Vercel: hacé Commit y Push de los cambios, incluyendo los archivos nuevos. Esperá el deploy correcto y recargá la web con Ctrl + F5. Probá nuevamente carga, Entrada, exportación y guardado/reapertura JSON. Las fotos, clips y audio se procesan en el navegador; no se agregó un backend ni un servicio pago. No cierres la pestaña ni suspendas el equipo durante la exportación.

Prueba reproducible de navegador: `scripts/entrance-clips-smoke.cjs` recibe como argumentos la ruta de Playwright, el ejecutable de Chrome y la URL local. Requiere FFmpeg/FFprobe y un clip de prueba en `artifacts/fixture-clip.mp4`; esos programas solo se usan para verificar el desarrollo, no para ejecutar la app. El script exporta y comprueba cuadros, cortes, contador, inicio de audio, movimiento del clip y ausencia de su sonido.

## Ajuste: canción completa y tres etapas

Archivos de este ajuste: `src/types/index.ts` y `src/utils/entrance.ts` guardan y calculan las tres etapas; `EntranceControls.tsx` las presenta; `App.tsx` actualiza la duración real al cargar/reconectar audio; `VideoPreviewPlayer.tsx`, `videoEncoder.ts` y `videoRecorder.ts` empiezan la música desde cero. `beatDetection.ts` analiza canciones largas sin desbordar argumentos. `FaqGuideModal.tsx`, README y este documento explican el flujo; `tests/entrance.test.ts` y `scripts/entrance-clips-smoke.cjs` verifican tiempos, MP4 y audio.

Entrada admite canciones de más de cinco minutos, respetando el límite existente de 50 MB por audio. Exportaciones largas tardan más y generan archivos de mayor tamaño. Los proyectos anteriores de Entrada pasan a canción completa al reconectar el audio y reciben la duración inicial predeterminada; revisá el segundo de sincronización y el contador. Los montajes normales y clips mantienen su comportamiento. No se agregaron dependencias.

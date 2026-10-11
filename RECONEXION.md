# Corrección de la carga de fotos

Se reprodujo en la web publicada un error al reconectar una carpeta con subcarpetas usando archivos individuales: `sub/IMG_001.jpg` y `IMG_001.jpg` se trataban como fotos distintas. Se duplicaba la biblioteca y el montaje conservaba referencias sin imágenes.

- `src/utils/reconnectPhotos.ts`: vincula por ID, ruta relativa y, para fotos pendientes, nombre único. Conserva las referencias, el orden y los ajustes guardados. No adivina coincidencias entre nombres repetidos.
- `src/App.tsx`: usa esa vinculación, informa archivos pendientes y permite armar un montaje con las fotos conectadas. Las referencias sin conectar se conservan en la biblioteca.
- `tests/core.test.ts`: cubre rutas distintas, IDs de proyectos anteriores, nombres repetidos y prioridad de las rutas exactas.
- `scripts/reconnect-smoke.cjs`: prueba en Chrome carpeta → archivos, archivos → carpeta, edición guardada y conexión parcial.

## Verificación local

Ejecutar `npm test`, `npm run build` y `npm run preview`. Cargar dos fotos desde una carpeta con subcarpetas, editar una escena y recargar la página. Reconectar esos archivos desde **Subir fotos locales**: el montaje debe recuperar las imágenes y conservar sus ajustes.

## Verificación en Vercel

Publicar los cambios desde GitHub y esperar a que el nuevo despliegue esté listo. Abrir la web, recargar con Ctrl + F5 y reconectar las fotos. Para nombres repetidos en subcarpetas, usar **Elegir carpeta** con la carpeta original para identificar cada archivo por su ruta.

El proyecto JSON y el borrador del navegador siguen guardando metadatos: después de recargar hay que volver a elegir las fotos. Si se seleccionan archivos de otra sesión con los mismos nombres únicos, no se puede distinguir su contenido del original a partir de esos metadatos; reconectar siempre los archivos de la sesión correcta.

**Usar todas las fotos** reemplaza explícitamente el montaje por las fotos conectadas, como ya lo hacía al estar toda la biblioteca disponible. Las pendientes siguen guardadas para reconectarlas más tarde. No se agregaron dependencias ni servicios del servidor.

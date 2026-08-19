<p align="center">
  <img src="assets/framenotes_icon_128.png" alt="Icono de FrameNotes" width="96" />
</p>

# FrameNotes

FrameNotes es una extensión para el navegador que añade herramientas a los vídeos de YouTube para estudiar, revisar o simplemente ver contenido con más comodidad. Todo funciona dentro de la propia página del vídeo y, si lo deseas, se sincroniza con Obsidian.

No necesitas saber programar para usarla: se instala, se ajusta desde un menú sencillo y se olvida..

## Índice

- [Funciones principales](#funciones-principales)
- [Instalación](#instalación)
- [Primeros pasos](#primeros-pasos)
- [Velocidad de reproducción](#velocidad-de-reproducción)
- [Transcripción](#transcripción)
- [Notas y favoritos](#notas-y-favoritos)
- [Tu colección](#tu-colección)
- [Integración con Obsidian](#integración-con-obsidian)
- [Apariencia y ajustes](#apariencia-y-ajustes)
- [Para desarrolladores](#para-desarrolladores)
  - [Permisos](#permisos)
  - [Pruebas](#pruebas)
  - [Limitaciones](#limitaciones)



## Funciones principales

- **Velocidad de reproducción**: cambia la velocidad entre 0,1× y 16× con deslizador, botones rápidos o atajos de teclado.
- **Transcripción**: un panel lateral muestra los subtítulos del vídeo. Puedes  elegir el idioma, como quieras que se vean, desde linea a linea, por parrafos o todo el video de golpe, busca en ellos, copialos o haz notas referenciando partes textuales del video.
- **Notas con marca de tiempo**: apunta una nota justo en el momento del vídeo que te interesa y vuelve a ella con un clic.
- **Favoritos**: guarda momentos concretos y recupéralos cuando quieras.
- **Nota general**: un espacio para resumir el vídeo, con carpeta y etiquetas (tags) propias.
- **Obsidian (opcional)**: cada vídeo puede convertirse en una única nota Markdown en tu vault.
- **Retroceso al pausar**: al detener el vídeo, permite retrocede unos segundos para retomar el contexto.

## Instalación

1. Descarga o clona este repositorio.
2. Abre la página de extensiones de tu navegador (por ejemplo, `chrome://extensions` o `brave://extensions`).
3. Activa el **modo desarrollador**.
4. Pulsa **Cargar descomprimida** (o *Load unpacked*) y selecciona la carpeta del proyecto.
5. Abre cualquier vídeo de YouTube y verás los nuevos botones en el reproductor.

## Primeros pasos

Al abrir la extensión (clic en el icono de FrameNotes) verás el **control rápido**, con los interruptores de cada función:

- **Transcripción**: activa o desactiva el panel de subtítulos.
- **Obsidian**: activa o desactiva la conexión con Obsidian.
- **Retroceso al pausar**: recupera contexto al detener el vídeo.
- **Atajos de velocidad**: teclas para saltar a una velocidad concreta.

Desde ahí también puedes abrir la **configuración completa** para personalizar cada detalle. Todos los cambios se guardan automáticamente.

En el propio reproductor de YouTube aparecen cuatro botones nuevos: mostrar/ocultar la transcripción, controlar la velocidad, abrir las notas del vídeo y crear una nota en ese instante.

## Velocidad de reproducción

- Escribe una velocidad exacta o usa el deslizador.
- Velocidades rápidas predefinidas (0,5×, 1×, 1,5×… 8×) que puedes personalizar.
- **Atajos de teclado**: asigna una tecla a una velocidad y decide si se aplica al pulsarla o solo mientras la mantienes.
- Activa **Mantener la velocidad** para que se conserve al cambiar de vídeo.

## Transcripción

El panel de transcripción se abre a la derecha del vídeo y se puede **arrastrar, redimensionar y recolocar**. Incluye:

- **Idioma preferido**: se prioriza una pista manual del idioma elegido y, si no existe, la automática. También puedes destacar idiomas favoritos en el selector.
- **Búsqueda**: localiza texto dentro de la transcripción y salta entre coincidencias.
- **Copiar**: copia la transcripción completa con un clic.
- **Modo de contenido**: mostrar todo desde el inicio o solo en tiempo real a medida que avanza el vídeo.
- **Agrupación**: una frase por bloque o el formato original de YouTube.
- **Desfase**: ajusta el retraso o adelanto visual de los subtítulos en milisegundos.

## Notas y favoritos

- **Crear nota en este momento** (botón del reproductor): guarda una nota ligada al instante actual, con texto y tags opcionales.
- Los marcadores aparecen sobre la **barra de progreso** del vídeo; pásales el ratón para verlos o haz clic para saltar a ellos.
- **Nota general**: resumen, conclusiones y organización del vídeo (carpeta y tags).

## Tu colección

Desde el popup, **★ Abrir notas y favoritos** muestra tu colección local: todas las notas agrupadas por carpeta, luego por vídeo, con búsqueda por título, canal, carpeta, tag o contenido. También puedes **descargar** el contenido en Markdown. En caso de vincularlo con obsidian las notas se almacen localmente en el navegador hasta que se habilita la conexion con obsidian.

## Integración con Obsidian

FrameNotes guarda las notas localmente y, de forma opcional, sincroniza cada vídeo como una única nota Markdown de Obsidian usando el plugin comunitario **Local REST API**.

Para configurarla:

1. Instala y activa **Local REST API** en Obsidian y copia su token.
2. En **Ajustes → Obsidian**, introduce la URL (por defecto `http://127.0.0.1:27123`) y el token.
3. Pulsa **probar conexión** y define la carpeta raíz, el Inbox y el formato de archivo.

Puedes personalizar el **nombre del archivo** (con `{video_title}`, `{channel}`, `{date}` y `{video_id}`) y la **plantilla Markdown** (con `{{frontmatter}}`, `{{title}}`, `{{general_note}}`, `{{timestamp_notes}}`, `{{url}}`, `{{channel}}`, `{{video_id}}` y `{{tags}}`). Ambos pueden guardarse como **presets** reutilizables.

La nota generada incluye frontmatter YAML (fuente, id de vídeo, canal, URL, fecha y tags), la nota general y las notas con timestamp ordenadas. Tus enlaces wiki (`[[…]]`) y tu Markdown se conservan.

Los cambios se guardan siempre localmente y se sincronizan solos cuando Obsidian está abierto. Si está cerrado, quedan pendientes y se reintentan automáticamente al abrir el navegador o cada minuto.

## Apariencia y ajustes

- **Panel de transcripción**: color de fondo y de texto, tipografía, tamaño y opacidad.
- **Ventanas de notas**: mismas opciones, compartidas o por separado.
- **Continuidad entre vídeos**: mantener la velocidad y recordar la posición del panel.
- **Tema claro/oscuro** e **idioma** (español/inglés).

## Para desarrolladores

Extensión **Manifest V3** sin dependencias de compilación: los módulos se cargan directamente como scripts de contenido y el popup usa módulos ES.

### Permisos

- `storage`: datos, configuración y estado de sincronización.
- `activeTab` y `scripting`: funciones sobre la pestaña de YouTube.
- Acceso a `youtube.com` y `video.google.com`: reproducción y transcripción.
- Acceso HTTP/HTTPS solo a `127.0.0.1` y `localhost`: comunicación con Local REST API.
- `alarms`: reintentos periódicos de la cola offline.

El token de Obsidian se guarda en el almacenamiento local de la extensión, no se registra y solo se usa desde el service worker para hablar con loopback.

### Pruebas

Ejecuta desde la raíz del proyecto:

```bash
node --test tests/*.test.js
```

### Limitaciones

- Para completar una sincronización, **Local REST API** debe estar instalado y Obsidian abierto (no es necesario mientras tomas notas) pero no se estarán mandando a la carpeta local mientras no se cumplan estas condiciones.
- La cola no resuelve conflictos: la extensión considera sus datos locales como fuente de verdad y sobrescribe su archivo asociado al reconectar a un mismo video que ya tenía notas previas.


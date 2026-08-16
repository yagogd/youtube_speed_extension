# YouTube Companion

Extensión MV3 para controlar la reproducción, consultar la transcripción y guardar notas con timestamp en YouTube. Las notas continúan guardándose localmente y, de forma opcional, cada vídeo puede sincronizarse como una única nota Markdown de Obsidian.

El ajuste de transcripción permite configurar el desfase visual de los subtítulos en milisegundos. Los valores positivos adelantan el texto y los negativos lo retrasan; el valor predeterminado es `1100`.

La colección local del popup funciona como un explorador: agrupa las notas por carpeta y subcarpeta de Obsidian, después por vídeo, y permite buscar por título, canal, carpeta, tag o contenido. Cada vídeo reúne su nota general, tags y markers ordenados por tiempo.

## Integración con Obsidian

La integración usa el plugin comunitario **Local REST API** de Obsidian y mantiene una cola offline local. Abre **Ajustes → Obsidian**, introduce la URL y el token del plugin, prueba la conexión y configura la carpeta raíz, Inbox y formato del archivo. La URL HTTP local predeterminada es `http://127.0.0.1:27123`; HTTPS también funciona si tu navegador confía en el certificado.

Durante un vídeo, el botón de nota general abre un espacio independiente para el resumen y la organización. El botón de notas temporales queda dedicado a la lista de timestamps. Desde ambos editores puedes gestionar:

- la nota general (resumen o conclusiones);
- la carpeta de destino, o déjala vacía para usar Inbox;
- tags del vídeo con sugerencias procedentes del vault;
- tags propios en cada nota con timestamp;
- las notas con timestamp existentes.

Con la integración habilitada, los cambios se guardan localmente y se intentan sincronizar automáticamente tras una breve pausa: nota general, tags, carpeta y notas timestamp. Si Obsidian está cerrado, permanecen pendientes. La extensión reintenta al iniciar el navegador, al recuperar/cambiar la configuración y cada minuto. Los botones de sincronización permiten forzar un reintento, pero no son necesarios en el flujo normal.

Visitar un vídeo no crea por sí solo ningún archivo en el vault. La nota Markdown aparece únicamente después de añadir una nota general, un tag, un marker o un favorito. El formato de exportación queda asociado al vídeo en ese primer apunte, por lo que cambiar posteriormente los ajustes de contenido o plantilla solo afecta a vídeos nuevos.

La carpeta predeterminada es una única ruta relativa al vault, por ejemplo `YouTube/Inbox` o `IA/Modelos`. Cada vídeo puede sustituirla con su propia carpeta. El nombre de archivo es editable con `{video_title}`, `{channel}`, `{date}` y `{video_id}`. La plantilla Markdown también es editable mediante `{{frontmatter}}`, `{{title}}`, `{{general_note}}`, `{{timestamp_notes}}`, `{{url}}`, `{{channel}}`, `{{video_id}}` y `{{tags}}`. El editor permite insertar estas variables como piezas, sin tener que escribirlas de memoria. Tanto los formatos de nombre como las plantillas pueden guardarse como presets personalizados y reutilizarse o eliminarse desde los ajustes. La plantilla predeterminada no repite el título como encabezado dentro de la nota.

Todas las opciones exportadas se muestran en una lista donde pueden activarse, desactivarse y reordenarse arrastrándolas o mediante sus flechas. Fuente, ID, canal, URL, fecha de creación de la nota y fecha de publicación del vídeo pueden configurarse por separado. Tags y enlaces de YouTube conservan su relación semántica con el frontmatter y las notas timestamp.

El editor de organización consulta `GET /tags/` y recorre `GET /vault/` cuando Obsidian está disponible. Muestra selectores visibles y filtrables con los tags y carpetas existentes, incluidas subcarpetas. También permite crear valores nuevos; los tags se muestran como chips y no se convierten automáticamente en carpetas.

La nota generada contiene frontmatter YAML (`source`, `video_id`, canal, URL, fecha y tags), nota general y notas temporales ordenadas. El Markdown del usuario, incluidos wikilinks como `[[Gradient Descent]]`, se conserva. Cada nota temporal puede incluir un enlace directo al instante de YouTube.

## Permisos

- `storage`: datos, configuración y estado de sincronización.
- `activeTab` y `scripting`: funciones existentes sobre la pestaña de YouTube.
- acceso a `youtube.com` y `video.google.com`: reproducción y transcripción.

- acceso HTTP/HTTPS exclusivamente a `127.0.0.1` y `localhost`: comunicación con Local REST API;
- `alarms`: reintentos periódicos de la cola offline.

El token se guarda en el almacenamiento local de la extensión, no se registra y sólo se utiliza desde el service worker para comunicarse con loopback.

## Limitaciones

Local REST API debe estar instalado y Obsidian abierto para completar una sincronización, pero no mientras se toman notas. La cola no es un sistema de resolución de conflictos: la extensión considera sus datos locales como fuente de verdad y sobrescribe su archivo asociado al volver a conectar. Esta versión no incluye IA, RAG ni búsqueda semántica.

## Pruebas

Ejecuta `node --test tests/*.test.js` desde la raíz del proyecto.

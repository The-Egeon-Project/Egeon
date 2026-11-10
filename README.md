# Egeon

**Bot de música para Discord desarrollado con TypeScript, Node.js y Lavalink.**

Egeon permite buscar música, reproducir canciones o playlists y administrar una cola independiente por servidor de Discord mediante comandos de texto. La reproducción de audio se delega a **Lavalink v4**; el bot coordina los comandos y el estado de cada reproductor con **discord.js**, **Kazagumo** y **Shoukaku**.

## El proyecto de un vistazo

| Área | Implementación |
| --- | --- |
| Lenguaje y runtime | TypeScript · Node.js 20 |
| Integración con Discord | discord.js |
| Gestión de reproductores | Kazagumo · Shoukaku |
| Servicio de audio | Lavalink v4 · YouTube Source |
| Ejecución | Docker · Docker Compose |

### Funcionalidades principales

- Reproducción y búsqueda por nombre o URL, con soporte de playlists según las fuentes disponibles.
- Cola por servidor: agregar, reproducir a continuación, pausar, reanudar, saltar y consultar canciones pendientes.
- Desconexión automática cuando el canal queda sin usuarios o cuando la cola permanece vacía.
- Manejo de errores de conexión y reintentos al recuperar nodos de Lavalink.

### Arquitectura

```text
Usuarios de Discord
       │ comandos de texto y canales de voz
       ▼
Bot Egeon (TypeScript + discord.js)
       │ estado, colas y reproductores
       ▼
Kazagumo + Shoukaku
       │ conexión con el servidor de audio
       ▼
Lavalink v4 + YouTube Source
```

### Decisiones técnicas destacadas

- **Separación de responsabilidades:** la lógica de Discord y los comandos viven en el bot, mientras Lavalink se encarga del audio.
- **Estado por servidor:** cada comunidad puede gestionar su propia cola y reproducción.
- **Recuperación ante fallas:** se detectan desconexiones de Lavalink y se reintenta incorporar los nodos.
- **Gestión de recursos:** temporizadores liberan la conexión cuando el bot queda solo en voz o sin música pendiente.
- **Despliegue reproducible:** Docker Compose administra los servicios y espera el estado saludable de Lavalink.

> **Estado del proyecto:** funciona con una cuenta de bot de Discord y una instancia de Lavalink correctamente configuradas. El build de TypeScript está disponible; todavía no hay una suite de tests automatizados. La disponibilidad de fuentes externas de música depende de Lavalink y sus plugins.

**Ir a:** [Funciones](#funciones) · [Requisitos](#requisitos) · [Configuración de Discord](#configuración-de-discord) · [Ejecutar con Docker Compose](#ejecutar-con-docker-compose) · [Comandos](#comandos) · [Desarrollo y validación](#desarrollo-y-validación)

---

## Funciones

- Comandos de texto con prefijo `!` y alias cortos.
- Búsqueda de canciones por nombre y reproducción mediante URL, según las fuentes habilitadas en Lavalink.
- Incorporación de playlists completas a la cola.
- Inserción de canciones o playlists como próximas en la cola, sin interrumpir la canción actual.
- Pausa, reanudación, salto a la siguiente canción y desconexión manual.
- Consulta de la canción actual, canciones pendientes y duración de la cola.
- Aviso en el canal de texto cuando empieza una canción.
- Desconexión automática después de **15 segundos sin usuarios humanos** en el canal de voz o **10 minutos con la cola vacía**.
- Respuesta al usuario cuando Lavalink no está disponible y reintento de conexión de nodos que se hayan eliminado.

Los comandos se procesan en servidores de Discord. Se ignoran los mensajes privados y los enviados por otros bots. Las respuestas del bot están en inglés.

## Requisitos

| Componente                         | Uso                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Node.js 20 y npm                   | Versión configurada en `.nvmrc` y en la imagen del bot.                |
| Una aplicación y un bot de Discord | Autenticación y acceso a los canales del servidor.                     |
| Lavalink v4                        | Búsqueda y reproducción de audio. El JAR incluido es la versión 4.2.2. |
| Plugin YouTube Source              | Habilita YouTube en la configuración actual.                           |
| Docker y Docker Compose            | Para ejecutar ambos servicios en contenedores.                         |
| Java 17                            | Para ejecutar Lavalink directamente; su contenedor ya incluye Java.    |

## Configuración de Discord

Si todavía no tenés el repositorio, clonalo antes de seguir con la configuración:

```bash
git clone https://github.com/The-Egeon-Project/Egeon.git
cd Egeon
```

1. Creá una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications) y configurá su bot.
2. Copiá el token del bot para usarlo como `DISCORD_TOKEN`.
3. En **Bot**, habilitá **Message Content Intent**: Egeon necesita leer el contenido de los mensajes para reconocer los comandos con `!`. Algunas aplicaciones también requieren aprobación para este intent privilegiado. [Documentación de intents](https://docs.discord.com/developers/events/gateway#privileged-intents).
4. Generá una invitación para instalar el bot en tu servidor con el scope `bot`.
5. Concedele los permisos **View Channels**, **Send Messages**, **Read Message History**, **Connect** y **Speak** en los canales donde lo vas a usar.

Revisá también los permisos particulares de cada canal, que pueden modificar los permisos concedidos al rol del bot. [Documentación de permisos de Discord](https://docs.discord.com/developers/topics/permissions).

## Variables de entorno

Creá un archivo `.env` en la raíz con tus propios valores:

```dotenv
DISCORD_TOKEN=TOKEN_DE_TU_BOT
LAVALINK_NAME=main
LAVALINK_URL=lavalink:2333
LAVALINK_PASSWORD=CLAVE_DE_TU_SERVIDOR_LAVALINK
LAVALINK_SECURE=false
```

| Variable            | Descripción                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`     | Token del bot de Discord.                                                                                                       |
| `LAVALINK_NAME`     | Nombre del nodo Lavalink que usa el bot.                                                                                        |
| `LAVALINK_URL`      | Dirección `host:puerto`, sin protocolo ni ruta. En Compose: `lavalink:2333`. Para ejecutar el bot en el host: `127.0.0.1:2333`. |
| `LAVALINK_PASSWORD` | Clave del servidor Lavalink.                                                                                                    |
| `LAVALINK_SECURE`   | `true` para conectar a un nodo con TLS; cualquier otro valor utiliza una conexión sin TLS.                                      |

`dotenv` carga `.env` al ejecutar el bot localmente. Compose entrega las variables al contenedor mediante `env_file`.

La clave de Lavalink debe coincidir en **los tres lugares** que la utilizan:

- `LAVALINK_PASSWORD` en `.env`.
- `lavalink.server.password` en [`Lavalink/application.yml`](Lavalink/application.yml).
- El encabezado `Authorization` del healthcheck de [`docker-compose.yml`](docker-compose.yml).

Si cambiás la clave, actualizá los tres valores antes de iniciar los servicios. Conservá tokens, claves y credenciales de las fuentes fuera de commits y logs compartidos. `.env` está ignorado por Git.

## Lavalink y YouTube

La configuración está en [`Lavalink/application.yml`](Lavalink/application.yml), con el puerto **2333**. La fuente incorporada de YouTube está deshabilitada y la reproducción se delega al plugin **YouTube Source**.

La configuración actual habilita búsqueda, videos y playlists, e incluye ajustes de clientes, OAuth y un servicio `remoteCipher`. Para replicar la instalación, revisá esos ajustes y configurá tus propias credenciales cuando correspondan. Los requisitos de reproducción pueden cambiar con el comportamiento de YouTube; consultá la documentación del plugin para la versión que utilices.

- [Configuración de Lavalink](https://lavalink.dev/configuration/config/file).
- [Documentación de YouTube Source](https://github.com/lavalink-devs/youtube-source).

El JAR del servidor se encuentra en `Lavalink/Lavalink.jar`. En Docker, `./plugins` se monta como `/app/plugins` y `application.yml` se monta en modo de solo lectura. Para una ejecución directa de Java, revisá la carpeta de plugins correspondiente a esa ejecución y la versión cargada en los logs.

## Ejecutar con Docker Compose

Después de configurar Discord, `.env` y Lavalink, ejecutá desde la raíz:

```bash
docker compose config -q
docker compose up -d --build
docker compose ps
```

| Servicio   | Contenedor        | Función                                         |
| ---------- | ----------------- | ----------------------------------------------- |
| `lavalink` | `lavalink_server` | Servidor de audio, expuesto en el puerto 2333.  |
| `bot`      | `egeon_bot`       | Bot conectado a Lavalink por la red de Compose. |

El bot espera a que Lavalink esté saludable antes de arrancar. Ambos contenedores usan la política de reinicio `unless-stopped`.

Para seguir sus logs:

```bash
docker compose logs -f bot lavalink
```

El inicio correcto incluye el nombre del bot seguido de `Ready!` y `Lavalink <nombre>: Ready!`. Comprobá después la respuesta de `!handshake` y la reproducción desde Discord.

Si solo cambiaste código del bot y Lavalink ya está funcionando, podés reconstruir ese servicio:

```bash
docker compose up -d --build --no-deps bot
```

## Ejecutar localmente

Instalá las dependencias con el lockfile del repositorio:

```bash
nvm use
npm ci
```

Necesitás un Lavalink accesible antes de reproducir música. Podés iniciar solamente ese servicio:

```bash
docker compose up -d --build lavalink
docker compose ps lavalink
```

Luego ejecutá el bot desde la raíz. Esta dirección apunta al puerto publicado en el host y reemplaza el valor de `.env` para ese proceso:

```bash
LAVALINK_URL=127.0.0.1:2333 npm run dev
```

`npm run dev` observa cambios en los archivos. Para ejecutar sin observación:

```bash
LAVALINK_URL=127.0.0.1:2333 npm start
```

También podés compilar TypeScript y ejecutar el resultado:

```bash
npm run build
LAVALINK_URL=127.0.0.1:2333 node dist/index.js
```

Para ejecutar Lavalink fuera de Docker, usá Java desde su carpeta, después de revisar la configuración y los plugins:

```bash
cd Lavalink
java -jar Lavalink.jar
```

## Comandos

Los nombres y alias se escriben en minúsculas. Para `!play` y `!playnext`, primero entrá a un canal de voz.

| Comando                      | Alias      | Acción                                                                                                                                   |
| ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `!handshake`                 | `!hs`      | Comprueba que el bot responde.                                                                                                           |
| `!play <búsqueda o URL>`     | `!p`       | Reproduce una canción o agrega canciones y playlists al final de la cola.                                                                |
| `!playnext <búsqueda o URL>` | `!pn`      | Inserta canciones al principio de la cola pendiente, conservando la canción actual y el orden de las canciones que ya estaban en espera. |
| `!skip`                      | `!sk`      | Pasa a la siguiente canción si hay canciones pendientes.                                                                                 |
| `!pause`                     | `!pa`      | Pausa la reproducción.                                                                                                                   |
| `!resume`                    | `!re`      | Reanuda la reproducción.                                                                                                                 |
| `!disconnect`                | `!ds`      | Destruye el reproductor del servidor y sale del canal de voz.                                                                            |
| `!queue`                     | `!q`       | Muestra la canción actual y la cola pendiente.                                                                                           |
| `!help`                      | `!h`, `!?` | Muestra la ayuda y los alias disponibles.                                                                                                |

Ejemplo en un canal de texto del servidor:

```text
!p Daft Punk Something About Us
!pn Gorillaz Feel Good Inc
!q
!pa
!re
!sk
!ds
```

Una búsqueda por nombre utiliza YouTube y toma el primer resultado. Las URLs y playlists dependen de las fuentes que Lavalink y sus plugins puedan resolver. `!playnext` no reanuda automáticamente un reproductor pausado. Si no hay canciones pendientes, `!skip` conserva la reproducción actual.

## Estructura del proyecto

```text
src/
  index.ts          Cliente de Discord, eventos y temporizadores de desconexión.
  commands.ts       Comandos, alias, descripciones y reconocimiento del prefijo.
  playerHandler.ts  Conexión de voz, búsqueda, reproducción y cola.
  messages.ts       Respuestas y validación de mensajes de Discord.
  utils.ts          Formato de duración de canciones y colas.
Lavalink/
  Lavalink.jar      Servidor de audio.
  application.yml  Configuración de Lavalink y sus fuentes.
  dockerfile        Imagen de Lavalink con Java.
  start.sh          Lanzador de Java para ejecución manual.
plugins/            Plugins montados por Lavalink en Docker.
dockerfile          Imagen del bot; compila y ejecuta dist/index.js.
docker-compose.yml  Servicios, conexión y healthcheck.
dist/               JavaScript, declaraciones y source maps generados.
```

## Desarrollo y validación

| Comando                              | Función                                 |
| ------------------------------------ | --------------------------------------- |
| `npm run dev`                        | Ejecuta `src/index.ts` con `tsx watch`. |
| `npm start`                          | Ejecuta `src/index.ts` con `tsx`.       |
| `npm run build`                      | Valida tipos y compila a `dist/`.       |
| `npx prettier --check "src/**/*.ts"` | Verifica el formato del código fuente.  |

Actualmente `npm test` es un placeholder que termina con error; no hay una suite de pruebas automatizadas configurada. Antes de desplegar cambios de TypeScript, ejecutá el build y la verificación de formato. Para cambios de comportamiento, comprobá en Discord los comandos afectados, la cola, la conexión de voz y la recuperación después de una desconexión de Lavalink.

## Solución de problemas

| Síntoma                                      | Qué revisar                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| El bot no inicia sesión en Discord           | `DISCORD_TOKEN`, conectividad y logs del bot.                                                           |
| Está conectado pero no reconoce `!help`      | Message Content Intent, permisos del canal, prefijo y minúsculas.                                       |
| Lavalink permanece `unhealthy`               | Logs de Lavalink y coincidencia de la clave con el healthcheck.                                         |
| El servidor de música aparece reconectándose | Estado de Lavalink, `LAVALINK_URL`, puerto, clave y `LAVALINK_SECURE`.                                  |
| Pide entrar a un canal de voz                | Entrá a un canal antes de usar `!play` o `!playnext`.                                                   |
| Se conecta al canal pero no reproduce        | Permisos Connect/Speak, estado del reproductor y errores de la fuente. Compará ambos logs por horario.  |
| Falla una búsqueda o URL de YouTube          | Versión y configuración de YouTube Source, clientes, OAuth y `remoteCipher`, según el error del plugin. |
| Sale después de terminar la música           | Desconexión automática por cola vacía durante 10 minutos.                                               |
| Sale cuando los usuarios abandonan el canal  | Desconexión automática después de 15 segundos sin usuarios humanos.                                     |

Para consultar el estado y errores recientes:

```bash
docker compose ps
docker logs --since 5m egeon_bot
docker logs --since 5m lavalink_server
```

## Licencia

El archivo [`LICENSE`](LICENSE) del repositorio contiene la licencia MIT.

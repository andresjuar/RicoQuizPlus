# RicoQuiz+

Plataforma de trivia interactivas en tiempo real. Proyecto integrador de la
materia Tecnologías de Desarrollo en el Servidor.

**Autores:** Andrés Juárez, Adán Juárez Jr

El proyecto lanzado se encuentra en el siguiente enlace:
https://proyecto-final-servidor-k6wl.onrender.com/

Debido a que Render bloquea el envío de correos, creamos esta cuenta ya autenticada:

Email: usuarioprueba@servidor.mx

Contraseña: Password123

## Stack de tecnologías

| Capa                         | Tecnología                             |
| ---------------------------- | -------------------------------------- |
| Lenguaje                     | TypeScript                             |
| Backend                      | Node.js, Express.js (arquitectura MVC) |
| Base de datos                | MongoDB + Mongoose                     |
| Tiempo real                  | Socket.io                              |
| Autenticación                | Inicio de sesión con correo y contraseña                 |
| IA (generación de preguntas) | Gemini API                             |
| Almacenamiento de imágenes   | Cloudinary                  |
| Documentación de API         | Swagger (OpenAPI 3.0)                  |
| Pruebas                      | Jest                                   |
| Calidad de código            | ESLint + Prettier                      |
| CI/CD                        | Hook de render para hacer deploy del commit más reciente        |
| Despliegue                   | Render                 |

## Configuración local

1. Clonar el repositorio y entrar a la carpeta del servidor:

    ```bash
    git clone <url-del-repo>
    cd proyecto-final-servidor
    ```

2. Instalar dependencias:

    ```bash
    npm install
    ```

3. Copiar el archivo de variables de entorno y llenarlo:

    ```bash
    cp .env.example .env
    ```

4. Iniciar el servidor en modo desarrollo:

    ```bash
    npm run dev
    ```

5. El servidor queda disponible en `http://localhost:3000` y la documentación
   interactiva de la API, junto con la documentación de los esquemas de la base de datos en `http://localhost:3000/api-docs`. O en https://proyecto-final-servidor-k6wl.onrender.com/api-docs

La API ya no sirve el frontend vanilla: el único cliente es la SPA de Angular (RicoQuizPlusClient, en Netlify).

## Activación de cuenta por correo

Está codificada completa (token firmado, correo, `GET /auth/activate/:token`, reenvío), pero se controla con una variable:

| `REQUIRE_EMAIL_ACTIVATION` | Registro | Login |
| --- | --- | --- |
| `false` (default) | La cuenta se crea activa y responde `{ token, user }` | No revisa `isActive` |
| `true` | La cuenta se crea inactiva, se manda el correo y no hay token | 403 hasta activar |

Para demostrarla: poner `REQUIRE_EMAIL_ACTIVATION=true` en `.env` (o en Render → Environment) y reiniciar. Render free bloquea SMTP, así que ahí hay que poner `BREVO_API_KEY` y `MAIL_FROM` (remitente verificado en Brevo); en local basta `SMTP_USER`/`SMTP_PASS` de Gmail. El link del correo abre `CLIENT_URL/activate/:token`.

## Login con Google

El cliente usa Google Identity Services y manda el ID token a `POST /auth/google { credential }`. La API lo verifica contra `GOOGLE_CLIENT_ID`; si ya existe una cuenta local con ese correo, la vincula (agrega `googleId`), si no, crea una cuenta de Google sin contraseña. En Google Cloud Console el Client ID tipo *Web* necesita en *Authorized JavaScript origins* `http://localhost:4200` y la URL de Netlify.

## Despliegue en Render

- Root directory `BACKEND`, build `npm ci && npm run build`, start `npm start`, health check `/health`.
- Variables: `MONGODB_URI`, `JWT_SECRET`, `ACTIVATION_TOKEN_SECRET`, `GOOGLE_CLIENT_ID`, `CLIENT_URL`, `CORS_ORIGIN`, `APP_BASE_URL`, `GEMINI_API_KEY`, `CLOUDINARY_*` y, solo para la demo de activación, `REQUIRE_EMAIL_ACTIVATION`, `BREVO_API_KEY`, `MAIL_FROM`.
- `CORS_ORIGIN` acepta varios orígenes separados por coma y comodines para los deploy previews: `https://<sitio>.netlify.app,https://*--<sitio>.netlify.app`.


## Scripts Disponibles

| Script                | Descripción                                                    |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Levanta el servidor en modo desarrollo con recarga automática    |
| `npm run build`       | Compila TypeScript a `dist/`                                     |
| `npm run build:clean` | Limpia `dist/` y vuelve a compilar                                |
| `npm start`           | Levanta el servidor ya compilado (`dist/`)                        |
| `npm test`            | Corre las pruebas con Jest                                        |
| `npm run lint`        | Corre ESLint                                                      |
| `npm run lint:fix`    | Corre ESLint y corrige automáticamente lo que se pueda            |
| `npm run format`      | Formatea el código con Prettier                                   |
| `npm run format:check`| Verifica el formato sin modificar archivos                        |


## Documentación

- [Arquitectura del sistema](./BACKEND/docs/arquitectura.md)
- [Diseño de la base de datos](./BACKEND//docs/database.md)
- [Tablero de trabajo](./BACKEND/docs/tablero-trabajo.md)
- [Funciones en Tiempo real](./BACKEND/docs/tiempo-real.md)

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

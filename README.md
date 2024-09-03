# Lista de Tareas Avanzada

Este proyecto es una aplicación web de lista de tareas avanzada desarrollada con Flask y JavaScript. Permite a los usuarios gestionar sus tareas de manera eficiente, con funcionalidades adicionales como la recepción de tareas por SMS.

## Descripción

La aplicación ofrece una interfaz intuitiva para la gestión de tareas, permitiendo a los usuarios:

- Crear nuevas tareas con fechas de vencimiento
- Organizar tareas en diferentes estados: pendientes, en progreso, completadas y archivadas
- Editar fechas de vencimiento de las tareas
- Buscar tareas específicas
- Recibir tareas por SMS y visualizarlas en la interfaz
- Gestionar números de teléfono autorizados para enviar tareas por SMS

## Pasos para configurar y ejecutar el proyecto

1. Clonar el repositorio
2. Instalar las dependencias:
   ```
   pip install -r requirements.txt
   ```
3. Configurar las variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto
   - Añadir la clave API de Telnyx: `TELNYX_API_KEY=tu_clave_api_aqui`
   - Añadir la contraseña para gestionar números autorizados: `AUTHORIZED_NUMBERS_PASSWORD=tu_contraseña_segura_aqui`
4. Inicializar la base de datos:
   ```
   python app.py
   ```
5. Acceder a la aplicación en `http://localhost:5000`

## Funcionalidades principales

1. **Gestión de tareas**: Crear, editar, mover entre estados y eliminar tareas.
2. **Organización por estados**: Visualizar tareas en columnas según su estado (pendientes, en progreso, completadas, archivadas).
3. **Fechas de vencimiento**: Asignar y editar fechas de vencimiento para las tareas.
4. **Búsqueda de tareas**: Filtrar tareas por texto.
5. **Recepción de tareas por SMS**: Integración con Telnyx para recibir tareas vía mensaje de texto.
6. **Actualización en tiempo real**: Las tareas recibidas por SMS se actualizan automáticamente en la interfaz.
7. **Persistencia de datos**: Almacenamiento de tareas en una base de datos SQLite.
8. **Gestión de números autorizados**: Añadir, editar y eliminar números de teléfono autorizados para enviar tareas por SMS.

## Tecnologías utilizadas

- Backend: Flask (Python)
- Frontend: HTML, CSS (Bootstrap), JavaScript
- Base de datos: SQLite
- API de SMS: Telnyx

Este proyecto demuestra la implementación de una aplicación web full-stack con funcionalidades avanzadas de gestión de tareas, integración de servicios externos y control de acceso para funciones sensibles.

# QuetzalNote — Online Notepad

Aplicación web de bloc de notas inspirada en [onlinenotepad.io](https://www.onlinenotepad.io/), desarrollada con Angular y Firebase Realtime Database como proyecto final del curso de Programación Web.

---

## Descripción

QuetzalNote permite crear, editar y gestionar notas con un editor de texto enriquecido (WYSIWYG). Las notas se sincronizan en tiempo real con Firebase mediante llamadas directas a la REST API, sin depender del SDK oficial. La aplicación cuenta con modo oscuro, soporte multiidioma, conversión a PDF y un parafraseador de texto.

---

## Autores

| Nombre | Rol |
|--------|-----|
| Gerson Morales | Frontend — Layout, UI, Sidebar, Topbar |
| Isidro Alexander Chuj | Frontend — Editor, Servicios, Auth, Firebase |

Estudiantes de cuarto año — Licenciatura en Tecnología de Sistemas Informáticos  
Universidad del Valle de Guatemala, Campus Altiplano  
Curso: Programación Web — Ing. Marvin Quiñones

---

## Funcionalidades

- CRUD completo de notas con guardado automático (debounce 1.5 s)
- Editor enriquecido con Quill: fuentes, tamaños, listas, tablas, imágenes, código, ecuaciones
- Modo oscuro / claro con preferencia persistida en localStorage
- Búsqueda avanzada de notas (Ctrl+K)
- Papelera con restauración de notas eliminadas
- Conversión de texto a PDF (vista dedicada)
- Parafraseador de texto
- Autenticación con Google y email/contraseña vía Firebase Identity Toolkit
- Soporte multiidioma: Inglés, Español, Francés y Portugués
- Descarga de notas en TXT, PDF o Word

---

## Tecnologías y librerías

| Tecnología | Uso |
|------------|-----|
| Angular 21 (standalone components) | Framework principal — rutas, servicios, signals |
| TypeScript | Tipado estático en todo el proyecto |
| Tailwind CSS | Estilos utilitarios y diseño responsive |
| ngx-quill / Quill.js | Editor de texto WYSIWYG |
| Firebase Realtime Database (REST API) | Persistencia de notas vía HTTP (`HttpClient`) |
| Firebase Identity Toolkit (REST API) | Autenticación Google y email/password |
| Google Identity Services (GIS) | Login con Google One Tap |
| SweetAlert2 | Modales de confirmación y alertas |
| jsPDF + html2canvas | Generación de PDFs desde HTML |
| mammoth.js | Importación de archivos `.docx` al editor |
| RxJS | Manejo reactivo de observables HTTP |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── app.routes.ts            # Configuración de rutas (Single Layout)
│   ├── app.config.ts            # Bootstrap de la app (HttpClient, Router)
│   ├── core/
│   │   ├── constants/           # Constantes globales
│   │   ├── interceptors/        # Interceptor de loading HTTP
│   │   ├── models/              # Interfaces: Note, User, Feedback
│   │   └── services/
│   │       ├── auth.service.ts       # Autenticación Firebase (REST)
│   │       ├── notes.service.ts      # CRUD de notas (Firebase REST)
│   │       ├── feedback.service.ts   # Envío de feedback
│   │       ├── pdf.service.ts        # Conversión HTML → PDF / Word
│   │       └── paraphraser.service.ts
│   ├── features/
│   │   └── notes/
│   │       └── components/note-editor/   # Editor Quill + auto-save
│   ├── layouts/
│   │   └── main-layout/         # Shell principal: sidebar + topbar + área central
│   └── shared/
│       ├── components/
│       │   ├── topbar/          # Barra superior adaptativa por vista
│       │   ├── sidebar/         # Panel lateral con lista de notas
│       │   ├── editor-toolbar/  # Toolbar de formato de Quill
│       │   ├── loader/          # Spinner global
│       │   └── empty-notes/     # Estado vacío del editor
│       └── services/
│           ├── ui.service.ts    # Estado centralizado de la UI (signals)
│           └── i18n.service.ts  # Internacionalización ligera
├── environments/
│   └── environment.ts           # Credenciales Firebase (NO incluido en el repo)
└── assets/icons/                # SVGs del sistema de íconos
```

---

## Instalación y ejecución local

### Requisitos previos

- Node.js 18 o superior
- Angular CLI: `npm install -g @angular/cli`

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/<usuario>/QuetzalNote.git
cd QuetzalNote

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno (ver sección siguiente)

# 4. Iniciar el servidor de desarrollo
ng serve
```

La aplicación estará disponible en `http://localhost:4200`.

---

## Configuración del entorno

El archivo `src/environments/environment.ts` **no está incluido en el repositorio** por razones de seguridad. Debes crearlo manualmente con tus propias credenciales de Firebase:

```typescript
export const environment = {
  production: false,
  firebaseUrl: 'https://TU-PROYECTO-default-rtdb.firebaseio.com/',
  firebaseApiKey: 'TU_API_KEY',
  googleClientId: 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};
```

Puedes obtener estos valores desde la consola de Firebase → Configuración del proyecto.

> **Importante:** El archivo `environment.ts` está en `.gitignore` y nunca debe subirse al repositorio público. Las reglas de seguridad de Firebase deben estar configuradas para permitir lectura/escritura según el flujo de autenticación del proyecto.

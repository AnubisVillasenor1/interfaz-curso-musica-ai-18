# **TAMV ONLINE NETWORK**

# Interfaz Curso Música AI (`interfaz-curso-musica-ai-18`)

Plataforma interactiva de última generación para la educación y producción musical impulsada por Inteligencia Artificial, experiencias cinemáticas en 3D y análisis de audio en tiempo real.

[![Despliegue en Vercel](https://img.shields.io/badge/Estado-Desplegado-success?style=flat-square&logo=vercel)](https://interfaz-curso-musica-ai.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-90.3%25-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![CSS](https://img.shields.io/badge/CSS-9.6%25-informational?style=flat-square&logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Licencia](https://img.shields.io/badge/Licencia-Privada%2FInstitucional-red?style=flat-square)]()

---

## 🚀 Descripción General

**interfaz-curso-musica-ai-18** es un ecosistema de software avanzado diseñado para fusionar la teoría musical, la ejecución instrumental en tiempo real y la asistencia de agentes de Inteligencia Artificial. Cuenta con un motor de audio local, renderizado gráfico tridimensional y un flujo completo de autenticación y facturación de inscripciones.

---

## ✨ Características Principales

*   **Motor Musical Local y Estudio FFT:** Integración de un estudio de análisis de audio con Transformada Rápida de Fourier (FFT) real para la visualización y procesamiento de señales musicales dentro del agente de música.
*   **Experiencia Cinemática 3D:** Entorno visual inmersivo construido con **Three.js** y **React Three Fiber**, optimizado para renderizar experiencias interactivas de aprendizaje.
*   **Agentes de Inteligencia Artificial (`AGENTES.md`):** Asistentes inteligentes especializados en tutoría musical, análisis de rendimiento y guía interactiva para estudiantes.
*   **Autenticación y Facturación:** Sistema robusto impulsado por **Supabase** para la gestión de usuarios, control de acceso y pasarelas de pago para inscripciones a los cursos.
*   **Gestión de Dependencias Moderna:** Configurado como un monorepo gestionado mediante **pnpm workspaces**.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza un conjunto moderno de tecnologías de alto rendimiento:

*   **Lenguaje Principal:** [TypeScript](https://www.typescriptlang.org/) (90.3%)
*   **Estilos:** [CSS](https://developer.mozilla.org/) (9.6%) / JavaScript (0.1%)
*   **Librerías de Audio y 3D:** 
    *   `three` y `@react-three/...` (Experiencia cinemática 3D)
    *   `tone` (Motor de síntesis y manipulación de audio web)
    *   `midi` (Procesamiento de archivos y flujos MIDI)
*   **Backend & Base de Datos:** [Supabase](https://supabase.com/) (Autenticación y gestión de datos transaccionales)
*   **Gestor de Paquetes:** `pnpm` (pnpm workspaces)

---

## 📂 Estructura del Repositorio

```text
├── .github/             # Configuraciones de GitHub y flujos de trabajo
├── aplicación/          # Rutas principales y lógica de la aplicación (Next.js App Router)
├── componentes/         # Componentes de interfaz de usuario reutilizables
├── documentos/          # Documentación técnica, guías y especificaciones
├── biblioteca/          # Módulos de lógica musical, utilidades y helpers
├── público/             # Recursos estáticos (imágenes, fuentes, assets)
├── AGENTES.md           # Definición y configuración de los agentes de IA
├── proxy.ts             # Proxy de red y manejo de peticiones seguras
└── paquete.json         # Dependencias y scripts principales del proyecto

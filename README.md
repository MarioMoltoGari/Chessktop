# ♟️ Chessktop

Chessktop es una aplicación de escritorio/web orientada al estudio y organización de repertorios de ajedrez.

El objetivo del proyecto es ofrecer una herramienta moderna para construir, analizar y entrenar aperturas de forma totalmente personalizada, combinando un gestor de estudios, un árbol de variantes y un motor de análisis integrado en una interfaz limpia e intuitiva.

Actualmente el proyecto se encuentra en desarrollo activo.

---

# Características actuales

## 📚 Biblioteca de estudios

- Organización mediante carpetas y subcarpetas.
- Creación y eliminación de estudios.
- Modo seguro para eliminar carpetas y estudios.
- Selección automática del siguiente estudio tras un borrado.
- Persistencia completa de la biblioteca.

## ♟️ Editor de variantes

- Tablero interactivo.
- Creación de variantes ilimitadas.
- Árbol de movimientos.
- Navegación por cualquier rama.
- Eliminación de ramas.
- Reinicio del estudio.

## 📝 Sistema de notas

Cada movimiento puede contener una nota independiente.

Las notas permiten guardar:

- ideas estratégicas
- planes
- recordatorios
- errores frecuentes
- análisis personales

Los movimientos con anotaciones aparecen identificados mediante un icono específico.

## 🤖 Stockfish integrado

Motor de análisis integrado mediante WebAssembly.

Actualmente incluye:

- evaluación en tiempo real
- MultiPV
- varias líneas principales
- profundidad configurable
- ejecución completamente local (sin servidor)

## 💾 Persistencia

Toda la información se almacena automáticamente mediante Local Storage.

Se conservan:

- biblioteca
- carpetas
- estudios
- árbol completo
- variantes
- notas
- estudio seleccionado

Al reiniciar la aplicación todo permanece exactamente igual.

## 📦 Copias de seguridad

La biblioteca puede:

- exportarse a un único archivo JSON
- importarse posteriormente

El archivo contiene toda la información necesaria para restaurar la aplicación.

## 📄 Exportación PGN

Cada estudio puede exportarse como PGN incluyendo:

- línea principal
- variantes
- estructura del árbol

---

# Arquitectura

El proyecto está desarrollado siguiendo una estructura modular.

```
src
│
├── components/
│   ├── library/
│   ├── engine/
│   └── ...
│
├── data/
│
├── types/
│
├── utils/
│
└── App.tsx
```

La aplicación separa claramente:

- interfaz
- lógica de negocio
- persistencia
- biblioteca
- motor de análisis

Los estudios se representan mediante un árbol de movimientos donde cada nodo almacena:

- movimiento
- posición (FEN)
- hijos
- nota
- información necesaria para reconstruir cualquier variante.

---

# Tecnologías

- React
- TypeScript
- Vite
- chess.js
- react-chessboard
- Stockfish 17 (WebAssembly)

---

# Filosofía del proyecto

Chessktop no pretende competir como una base de datos gigantesca de partidas.

Su objetivo es convertirse en un **gestor personal de repertorios**, donde el usuario pueda:

- organizar sus líneas
- analizarlas
- anotarlas
- entrenarlas
- mantenerlas sincronizadas

todo desde una única aplicación.

---

# Hoja de ruta

## Biblioteca

- [x] Carpetas
- [x] Subcarpetas
- [x] Estudios
- [x] Persistencia
- [x] Exportación
- [x] Importación
- [ ] Renombrar carpetas
- [ ] Renombrar estudios
- [ ] Arrastrar estudios entre carpetas
- [ ] Buscador

---

## Editor

- [x] Árbol de variantes
- [x] Navegación
- [x] Eliminación de ramas
- [x] Notas por movimiento
- [x] Exportación PGN
- [ ] Importación PGN
- [ ] Comentarios PGN
- [ ] Símbolos NAG
- [ ] Flechas y resaltado de casillas

---

## Stockfish

- [x] Integración
- [x] MultiPV
- [x] Profundidad configurable
- [ ] Configuración avanzada
- [ ] Análisis automático del estudio
- [ ] Detección de errores
- [ ] Sugerencias de mejora

---

## Entrenamiento

- [ ] Modo entrenamiento
- [ ] Repetición espaciada (SRS)
- [ ] Estadísticas
- [ ] Seguimiento del progreso
- [ ] Prioridad de líneas según dificultad
- [ ] Repaso inteligente

---

## Biblioteca online

- [ ] Cuentas de usuario
- [ ] Sincronización entre dispositivos
- [ ] Biblioteca en la nube
- [ ] Copias de seguridad automáticas
- [ ] Compartir estudios mediante enlace

---

## Preparación de partidas

- [ ] Preparación específica contra un rival
- [ ] Importación de repertorios
- [ ] Detección de aperturas
- [ ] Estadísticas del repertorio

---

## Experiencia de usuario

- [ ] Sistema de modales propio
- [ ] Sistema de notificaciones
- [ ] Atajos de teclado
- [ ] Tema oscuro
- [ ] Configuración personalizable
- [ ] Internacionalización
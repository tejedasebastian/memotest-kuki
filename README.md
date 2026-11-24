# Memotest

Juego de memoria con 16 cartas y 8 parejas de Pokémon, hecho con HTML, CSS y JavaScript sin frameworks. El repositorio conserva el nombre histórico **`memotest-kuki`**; el proyecto se llama **Memotest**.

**Demo:** https://tejedasebastian.github.io/memotest-kuki/

## Cómo jugar

1. Pulsa **Empezar** para barajar y repartir las 16 cartas.
2. Descubre dos cartas por intento.
3. Si los Pokémon coinciden, la pareja queda fija. Si no, se vuelven a ocultar.
4. Encuentra las 8 parejas antes de que… bueno, no hay límite de tiempo: el cronómetro solo registra cuánto tardas.
5. Al completar el tablero, el estado muestra la victoria con el tiempo y los intentos. Pulsa **Empezar** para jugar otra vez.

El memorama no tiene condición de derrota: se juega hasta encontrar las 8 parejas. Por eso no existe un estado de "perdiste"; el antiguo uso de `alert-danger` para la victoria era un error de la implementación anterior.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

El servidor estático queda disponible en <http://127.0.0.1:4183>. No hay paso de build: se sirven los archivos tal cual. Se puede cambiar el puerto con la variable `PORT`.

## Pruebas E2E

Las pruebas usan Playwright con Chromium y un único spec E2E:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

El servidor se inicia automáticamente en el puerto **4183**. La suite comprueba:

- 16 cartas creadas y 8 parejas formadas dinámicamente por el atributo `name`.
- Resolución completa del tablero y estado de victoria real (`data-state="won"` + `alert-success`, nunca `alert-danger`).
- Un par incorrecto se voltea y el tablero queda bloqueado durante el volteo.
- Reinicio de la partida con contadores y cartas reiniciados.
- Viewports de 390 px y 320 px sin overflow horizontal, con imágenes cargadas y sin errores de consola.

Los reportes se generan en `playwright-report/` (HTML) y `artifacts/results.json` (JSON). El workflow [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) ejecuta la suite en cada push a `main` y sube ambos como artifact.

Para probar el sitio publicado:

```powershell
$env:BASE_URL = "https://tejedasebastian.github.io/memotest-kuki"
npm run test:e2e
```

En bash:

```bash
BASE_URL="https://tejedasebastian.github.io/memotest-kuki" npm run test:e2e
```

## Estructura

```text
index.html                 Tablero y controles
main.css                   Estilos y layout responsive
main.js                    Lógica del juego
server.js                  Servidor estático mínimo para desarrollo y E2E
imagenes/*.webp            Las 16 cartas (máximo 256 px de lado)
tests/e2e/memotest.spec.js Suite E2E de Playwright
.github/workflows/e2e.yml  CI de pruebas y artifact
```

## Decisiones técnicas

- **Bootstrap 5.3.2** y **Bootstrap Icons 1.11.3** se cargan desde jsDelivr con integridad SRI. El sitio no depende de `node_modules` al publicarse.
- Las cartas se convirtieron de PNG a **WebP** (máximo 256 px de lado, calidad 85). Las 16 imágenes suman alrededor de 227 KB.
- La victoria se representa con `#estado[data-state="won"]` y la clase `alert-success`; `alert-danger` queda reservado para errores, no para ganar.
- Los intentos cuentan solamente parejas completas (dos cartas descubiertas).
- El cronómetro se detiene al ganar y se reinicia al comenzar una partida nueva; no se acumulan intervalos al pulsar **Empezar** varias veces.

## Licencia

[MIT](LICENSE) © 2024 Sebastian Tejeda

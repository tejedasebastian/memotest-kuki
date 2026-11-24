const { test, expect } = require('@playwright/test');

async function empezarJuego(page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.locator('#estado')).toHaveAttribute('data-state', 'playing');
    await expect(page.locator('.pokemon')).toHaveCount(16);
}

async function obtenerParejas(page) {
    return page.evaluate(() => {
        const tarjetas = Array.from(document.querySelectorAll('.carta'));
        const parejas = new Map();

        tarjetas.forEach((tarjeta, indice) => {
            const imagen = tarjeta.querySelector('.pokemon');
            const nombre = imagen ? imagen.getAttribute('name') : null;
            if (!parejas.has(nombre)) {
                parejas.set(nombre, []);
            }
            parejas.get(nombre).push(indice);
        });

        return Object.fromEntries(parejas);
    });
}

async function esperarImagenesCargadas(page) {
    await expect
        .poll(() =>
            page
                .locator('.pokemon')
                .evaluateAll((imagenes) => imagenes.every((imagen) => imagen.complete && imagen.naturalWidth > 0)),
        )
        .toBe(true);
}

test('crea 16 cartas, 8 parejas y carga los recursos sin node_modules', async ({ page }) => {
    const peticionesNodeModules = [];
    page.on('request', (request) => {
        if (request.url().includes('node_modules')) {
            peticionesNodeModules.push(request.url());
        }
    });

    await page.goto('/');

    await expect(page.locator('.carta')).toHaveCount(16);
    await expect(page.getByRole('button', { name: 'Empezar' })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.locator('#estado')).toHaveAttribute('data-state', 'playing');
    await expect(page.locator('.pokemon')).toHaveCount(16);
    await esperarImagenesCargadas(page);

    const parejas = Object.values(await obtenerParejas(page));
    expect(parejas).toHaveLength(8);
    parejas.forEach((pareja) => expect(pareja).toHaveLength(2));

    const fuentes = await page.locator('.pokemon').evaluateAll((imagenes) =>
        imagenes.map((imagen) => imagen.getAttribute('src')),
    );
    fuentes.forEach((fuente) => expect(fuente).toMatch(/^imagenes\/\d+\.webp$/));

    const bootstrap = page.locator('link[href*="bootstrap@5.3.2"]');
    const iconos = page.locator('link[href*="bootstrap-icons@1.11.3"]');
    await expect(bootstrap).toHaveAttribute('integrity', /^sha384-/);
    await expect(iconos).toHaveAttribute('integrity', /^sha384-/);

    expect(peticionesNodeModules).toEqual([]);
});

test('voltea un par incorrecto y bloquea el tablero mientras tanto', async ({ page }) => {
    await empezarJuego(page);

    const parejas = Object.values(await obtenerParejas(page));
    const cartas = page.locator('.carta');
    const imagenes = page.locator('.pokemon');
    const primera = parejas[0][0];
    const segunda = parejas[1][0];
    const tercera = parejas[2][0];

    await cartas.nth(primera).click();
    await expect(imagenes.nth(primera)).toBeVisible();

    await cartas.nth(segunda).click();
    await expect(imagenes.nth(segunda)).toBeVisible();
    await expect(page.locator('#intento')).toHaveText('1');

    // Durante el volteo el tablero está bloqueado: una tercera carta no debe abrirse.
    await cartas.nth(tercera).click();
    await expect(imagenes.nth(tercera)).toBeHidden();

    await expect(imagenes.nth(primera)).toBeHidden({ timeout: 3_000 });
    await expect(imagenes.nth(segunda)).toBeHidden();
    await expect(page.locator('#intento')).toHaveText('1');
    await expect(page.locator('#estado')).toHaveAttribute('data-state', 'playing');
});

test('resuelve el tablero y muestra el estado de victoria real', async ({ page }, testInfo) => {
    await empezarJuego(page);

    const parejas = Object.values(await obtenerParejas(page));
    const cartas = page.locator('.carta');
    const imagenes = page.locator('.pokemon');

    for (const [primera, segunda] of parejas) {
        await cartas.nth(primera).click();
        await expect(imagenes.nth(primera)).toBeVisible();

        await cartas.nth(segunda).click();
        await expect(cartas.nth(primera)).toHaveClass(/emparejada/);
        await expect(cartas.nth(segunda)).toHaveClass(/emparejada/);
    }

    const estado = page.locator('#estado');
    await expect(estado).toHaveAttribute('data-state', 'won');
    await expect(estado).toHaveClass(/alert-success/);
    await expect(estado).not.toHaveClass(/alert-danger/);
    await expect(estado).toContainText('¡Ganaste!');
    await expect(page.locator('#intento')).toHaveText('8');
    await expect(page.locator('.emparejada')).toHaveCount(16);
    await expect(imagenes).toHaveCount(16);
    await esperarImagenesCargadas(page);

    // El cronómetro se detiene al ganar.
    const tiempoFinal = await page.locator('#tiempo').textContent();
    await page.waitForTimeout(1_300);
    await expect(page.locator('#tiempo')).toHaveText(tiempoFinal);

    await testInfo.attach('victoria-escritorio', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
    });
});

test('reinicia la partida y vuelve a repartir las cartas', async ({ page }) => {
    await empezarJuego(page);

    const parejas = Object.values(await obtenerParejas(page));
    const cartas = page.locator('.carta');

    await cartas.nth(parejas[0][0]).click();
    await cartas.nth(parejas[0][1]).click();
    await expect(page.locator('#intento')).toHaveText('1');
    await expect(page.locator('.emparejada')).toHaveCount(2);

    await page.getByRole('button', { name: 'Empezar' }).click();

    await expect(page.locator('#estado')).toHaveAttribute('data-state', 'playing');
    await expect(page.locator('#intento')).toHaveText('0');
    await expect(page.locator('#tiempo')).toHaveText('0');
    await expect(page.locator('.emparejada')).toHaveCount(0);
    await expect(page.locator('.pokemon')).toHaveCount(16);
    await expect(page.locator('.icon-pregunta:not(.oculto)')).toHaveCount(16);

    const imagenesVisibles = await page
        .locator('.pokemon')
        .evaluateAll((imagenes) => imagenes.filter((imagen) => !imagen.classList.contains('oculto')).length);
    expect(imagenesVisibles).toBe(0);
});

for (const ancho of [390, 320]) {
    test(`móvil ${ancho}px: sin overflow, imágenes cargadas y sin errores de consola`, async ({ page }, testInfo) => {
        const errores = [];
        page.on('console', (mensaje) => {
            if (mensaje.type() === 'error') {
                errores.push(mensaje.text());
            }
        });
        page.on('pageerror', (error) => errores.push(error.message));

        await page.setViewportSize({ width: ancho, height: 844 });
        await empezarJuego(page);
        await esperarImagenesCargadas(page);

        const medidas = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
        }));
        expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.clientWidth);
        expect(medidas.bodyScrollWidth).toBeLessThanOrEqual(medidas.clientWidth);

        const cartasFuera = await page.locator('.carta').evaluateAll((cartas) => {
            const anchoVista = document.documentElement.clientWidth;
            return cartas.filter((carta) => {
                const rect = carta.getBoundingClientRect();
                return rect.left < 0 || rect.right > anchoVista;
            }).length;
        });
        expect(cartasFuera).toBe(0);

        expect(errores).toEqual([]);

        await testInfo.attach(`memotest-${ancho}px`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
        });
    });
}

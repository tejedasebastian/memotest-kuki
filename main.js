(() => {
    'use strict';

    const TOTAL_PAREJAS = 8;
    const NOMBRES_POKEMON = [
        'pokemon1',
        'pokemon2',
        'pokemon3',
        'pokemon4',
        'pokemon5',
        'pokemon6',
        'pokemon7',
        'pokemon8',
    ];
    const TIEMPO_DE_VOLTEO_MS = 850;

    const estado = {
        jugando: false,
        bloqueado: false,
        primeraCarta: null,
        parejasEncontradas: 0,
        intentos: 0,
        segundos: 0,
        intervaloTiempo: null,
        timeoutVolteo: null,
    };

    const cartas = Array.from(document.querySelectorAll('.carta'));
    const tablero = document.querySelector('.tablero');
    const botonEmpezar = document.querySelector('.boton-empezar');
    const elementoEstado = document.querySelector('#estado');
    const elementoTiempo = document.querySelector('#tiempo');
    const elementoIntento = document.querySelector('#intento');

    function mostrarEstado(texto, nombreEstado) {
        elementoEstado.textContent = texto;
        elementoEstado.dataset.state = nombreEstado;
        elementoEstado.classList.remove('alert-primary', 'alert-success', 'alert-danger');
        elementoEstado.classList.add(nombreEstado === 'won' ? 'alert-success' : 'alert-primary');
    }

    function detenerIntervalo() {
        if (estado.intervaloTiempo !== null) {
            clearInterval(estado.intervaloTiempo);
            estado.intervaloTiempo = null;
        }
    }

    function iniciarIntervalo() {
        detenerIntervalo();
        estado.intervaloTiempo = setInterval(() => {
            estado.segundos += 1;
            elementoTiempo.textContent = String(estado.segundos);
        }, 1000);
    }

    function cancelarVolteoPendiente() {
        if (estado.timeoutVolteo !== null) {
            clearTimeout(estado.timeoutVolteo);
            estado.timeoutVolteo = null;
        }
    }

    function desbloquearTablero() {
        estado.bloqueado = false;
        tablero.classList.remove('bloqueado');
        tablero.setAttribute('aria-busy', 'false');
    }

    function limpiarTablero() {
        cancelarVolteoPendiente();
        desbloquearTablero();
        estado.jugando = false;
        estado.primeraCarta = null;
        estado.parejasEncontradas = 0;
        estado.intentos = 0;
        estado.segundos = 0;

        cartas.forEach((carta, indice) => {
            const icono = carta.querySelector('.icon-pregunta');
            const espacio = carta.querySelector('.pokemon-espacio');
            icono.classList.remove('oculto');
            espacio.innerHTML = '';
            carta.classList.remove('emparejada', 'revelada');
            carta.disabled = false;
            carta.dataset.numero = String(indice + 1);
            carta.setAttribute('aria-label', `Carta oculta ${indice + 1}`);
        });

        elementoTiempo.textContent = '0';
        elementoIntento.textContent = '0';
    }

    function crearImagenPokemon(numero) {
        const imagen = document.createElement('img');
        imagen.src = `imagenes/${numero}.webp`;
        imagen.alt = '';
        imagen.draggable = false;
        imagen.classList.add('pokemon', 'oculto');
        imagen.setAttribute('name', NOMBRES_POKEMON[numero % TOTAL_PAREJAS]);
        return imagen;
    }

    function barajarNumeros() {
        const numeros = Array.from({ length: cartas.length }, (_, indice) => indice);
        for (let i = numeros.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [numeros[i], numeros[j]] = [numeros[j], numeros[i]];
        }
        return numeros;
    }

    function repartirCartas() {
        const numeros = barajarNumeros();
        cartas.forEach((carta, indice) => {
            const imagen = crearImagenPokemon(numeros[indice]);
            carta.querySelector('.pokemon-espacio').appendChild(imagen);
        });
    }

    function mostrarCarta(carta) {
        const icono = carta.querySelector('.icon-pregunta');
        const imagen = carta.querySelector('.pokemon');
        icono.classList.add('oculto');
        imagen.classList.remove('oculto');
        carta.classList.add('revelada');
        carta.setAttribute('aria-label', 'Carta descubierta');
    }

    function ocultarCarta(carta) {
        const icono = carta.querySelector('.icon-pregunta');
        const imagen = carta.querySelector('.pokemon');
        icono.classList.remove('oculto');
        imagen.classList.add('oculto');
        carta.classList.remove('revelada');
        carta.setAttribute('aria-label', `Carta oculta ${carta.dataset.numero}`);
    }

    function marcarPareja(carta) {
        carta.classList.add('emparejada');
        carta.disabled = true;
        carta.setAttribute('aria-label', 'Pareja encontrada');
    }

    function actualizarIntentos() {
        elementoIntento.textContent = String(estado.intentos);
    }

    function ganar() {
        estado.jugando = false;
        detenerIntervalo();
        const resumen = `¡Ganaste! Completaste las 8 parejas en ${estado.intentos} intentos y ${estado.segundos} s. Pulsa «Empezar» para volver a jugar.`;
        mostrarEstado(resumen, 'won');
    }

    function resolverPareja(primeraCarta, segundaCarta) {
        const nombrePrimera = primeraCarta.querySelector('.pokemon').getAttribute('name');
        const nombreSegunda = segundaCarta.querySelector('.pokemon').getAttribute('name');

        estado.intentos += 1;
        actualizarIntentos();

        if (nombrePrimera === nombreSegunda) {
            marcarPareja(primeraCarta);
            marcarPareja(segundaCarta);
            estado.parejasEncontradas += 1;
            desbloquearTablero();

            if (estado.parejasEncontradas === TOTAL_PAREJAS) {
                ganar();
            }
            return;
        }

        estado.timeoutVolteo = setTimeout(() => {
            ocultarCarta(primeraCarta);
            ocultarCarta(segundaCarta);
            estado.timeoutVolteo = null;
            desbloquearTablero();
        }, TIEMPO_DE_VOLTEO_MS);
    }

    function manejarClicCarta(carta) {
        if (!estado.jugando || estado.bloqueado) {
            return;
        }
        if (carta.classList.contains('emparejada') || carta === estado.primeraCarta) {
            return;
        }

        mostrarCarta(carta);

        if (estado.primeraCarta === null) {
            estado.primeraCarta = carta;
            return;
        }

        const primeraCarta = estado.primeraCarta;
        estado.primeraCarta = null;
        estado.bloqueado = true;
        tablero.classList.add('bloqueado');
        tablero.setAttribute('aria-busy', 'true');
        resolverPareja(primeraCarta, carta);
    }

    function comenzarJuego() {
        limpiarTablero();
        detenerIntervalo();
        repartirCartas();
        mostrarEstado('Desvela las casillas para encontrar parejas', 'playing');
        estado.jugando = true;
        iniciarIntervalo();
    }

    botonEmpezar.addEventListener('click', comenzarJuego);
    cartas.forEach((carta) => {
        carta.addEventListener('click', () => manejarClicCarta(carta));
    });
})();

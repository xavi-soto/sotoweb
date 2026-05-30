/* ═══════════════════════════════════════════════════════════════════
   tracker.js — soto³ sistema de observación de visita
   ───────────────────────────────────────────────────────────────────
   Cómo funciona:
   · Solo se activa si la URL contiene ?visita
   · Una vez activo, persiste entre páginas usando sessionStorage
   · Registra: páginas vistas, tiempo por página, scroll, clics
   · Microtextos contextuales durante la navegación
   · Al pulsar el botón flotante, abre un modal con el informe

   Para editar las reglas    → busca REGLAS DE INTERPRETACIÓN
   Para editar los textos    → busca TEXTOS DEL INFORME
   Para editar microtextos   → busca MICROTEXTOS_GLOBAL
   Para añadir páginas       → busca MAPA DE PÁGINAS
═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────────────
       ACTIVACIÓN POR URL SECRETA
       Solo funciona si la URL contiene ?visita,
       o si la sesión ya fue activada en una página anterior.
    ──────────────────────────────────────────────────────────────────── */
    const SESION_ACTIVA_KEY = 'soto_visita_activa';

    if (window.location.search.includes('visita')) {
        sessionStorage.setItem(SESION_ACTIVA_KEY, '1');
    } else if (!sessionStorage.getItem(SESION_ACTIVA_KEY)) {
        return;
    }

    /* ─────────────────────────────────────────────────────────────────
       MAPA DE PÁGINAS
       Añade aquí cualquier URL nueva del sitio.
       Categorías: 'inicio' | 'diseno' | 'ilustracion' | 'tecnico' | 'info'
    ──────────────────────────────────────────────────────────────────── */
    const MAPA_PAGINAS = {
        '/':                                      { nombre: 'Inicio',                      categoria: 'inicio'      },
        '/trabajos/':                             { nombre: 'Trabajos',                    categoria: 'inicio'      },
        '/premios-deporte-y-ciudadania/':         { nombre: 'Premios Deporte',             categoria: 'diseno'      },
        '/guardabosques-gdl/':                    { nombre: 'Guardabosques GDL',           categoria: 'diseno'      },
        '/monaco/':                               { nombre: 'Mōnaco',                      categoria: 'diseno'      },
        '/el-hogar/':                             { nombre: 'El hogar',                    categoria: 'diseno'      },
        '/colectivo-habitantes/':                 { nombre: 'Colectivo habitantes',        categoria: 'diseno'      },
        '/addy/':                                 { nombre: 'ADDY esotérica',              categoria: 'diseno'      },
        '/inmenso/':                              { nombre: 'Inmenso',                     categoria: 'ilustracion' },
        '/hay-flores-a-domicilio/':               { nombre: 'Hay flores a domicilio',      categoria: 'ilustracion' },
        '/estudio-de-objetos-no-identificados/':  { nombre: 'Objetos no identificados',    categoria: 'ilustracion' },
        '/soto-artista-virtual/':                 { nombre: 'soto artista virtual',        categoria: 'tecnico'     },
        '/desoido/':                              { nombre: 'Desoído',                     categoria: 'tecnico'     },
        '/por-que-nos-cuesta-escuchar/':          { nombre: 'Por qué nos cuesta escuchar', categoria: 'tecnico'     },
        '/acerca-de-soto/':                       { nombre: 'CV / About',                  categoria: 'info'        },
        '/contacto/':                             { nombre: 'Contacto',                    categoria: 'info'        },
    };

    /* ─────────────────────────────────────────────────────────────────
       SESIÓN — carga o inicializa
    ──────────────────────────────────────────────────────────────────── */
    const STORE_KEY = 'soto_visita_v1';

    function cargarSesion() {
        try {
            const raw = sessionStorage.getItem(STORE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {
            inicio:           Date.now(),
            paginas:          [],
            totalClics:       0,
            dispositivoTactil: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
            informeGenerado:  false,
        };
    }

    function guardarSesion(e) {
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify(e)); } catch (e) {}
    }

    const urlActual  = window.location.pathname.replace(/\/?$/, '/').replace(/\/+/, '/');
    const metaPagina = MAPA_PAGINAS[urlActual] || { nombre: document.title || urlActual, categoria: 'otro' };

    let estado = cargarSesion();

    /* Timestamp de entrada A ESTA PÁGINA — independiente del inicio de sesión */
    const entradaEstaPagina = Date.now();

    const registroPagina = {
        url:        urlActual,
        nombre:     metaPagina.nombre,
        categoria:  metaPagina.categoria,
        entrada:    entradaEstaPagina,
        salida:     null,
        scrollMax:  0,
        clics:      0,
        velocidades: [],
    };

    estado.paginas.push(registroPagina);
    guardarSesion(estado);

    /* ─────────────────────────────────────────────────────────────────
       TRACKING DE SCROLL
    ──────────────────────────────────────────────────────────────────── */
    let ultimoScrollY = window.scrollY;
    let ultimoScrollT = Date.now();

    window.addEventListener('scroll', () => {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct  = docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 100;
        if (pct > registroPagina.scrollMax) registroPagina.scrollMax = pct;
        const ahora = Date.now();
        const dt    = ahora - ultimoScrollT;
        if (dt > 60) {
            const vel = Math.abs(window.scrollY - ultimoScrollY) / (dt / 1000);
            registroPagina.velocidades.push(Math.round(vel));
            ultimoScrollY = window.scrollY;
            ultimoScrollT = ahora;
        }
        guardarSesion(estado);
    }, { passive: true });

    /* ─────────────────────────────────────────────────────────────────
       TRACKING DE CLICS
    ──────────────────────────────────────────────────────────────────── */
    document.addEventListener('click', (e) => {
        if (e.target.closest('#soto-informe-modal')) return;
        registroPagina.clics++;
        estado.totalClics++;
        guardarSesion(estado);
    });

    /* ─────────────────────────────────────────────────────────────────
       GUARDA AL SALIR
    ──────────────────────────────────────────────────────────────────── */
    function alSalir() {
        registroPagina.salida = Date.now();
        guardarSesion(estado);
    }
    window.addEventListener('beforeunload', alSalir);
    document.addEventListener('visibilitychange', () => { if (document.hidden) alSalir(); });

    /* ─────────────────────────────────────────────────────────────────
       HELPERS
    ──────────────────────────────────────────────────────────────────── */
    function tiempoTotalSeg()     { return (Date.now() - estado.inicio) / 1000; }
    function tiempoEnPaginaSeg()  { return (Date.now() - entradaEstaPagina) / 1000; }

    function tiempoEnCategoria(cat) {
        return estado.paginas
            .filter(p => p.categoria === cat)
            .reduce((acc, p) => acc + ((p.salida || Date.now()) - p.entrada) / 1000, 0);
    }
    function paginasEnCategoria(cat) {
        return estado.paginas.filter(p => p.categoria === cat).length;
    }
    function velocidadMediaGlobal() {
        const todas = estado.paginas.flatMap(p => p.velocidades || []);
        if (!todas.length) return 0;
        return todas.reduce((a, b) => a + b, 0) / todas.length;
    }
    function scrollMedioGlobal() {
        const scrolls = estado.paginas.map(p => p.scrollMax).filter(s => s > 0);
        if (!scrolls.length) return 0;
        return scrolls.reduce((a, b) => a + b, 0) / scrolls.length;
    }
    function fmtTiempo(seg) {
        const m = Math.floor(seg / 60), s = Math.round(seg % 60);
        return m > 0 ? `${m} min ${s} s` : `${s} s`;
    }

    /* ═══════════════════════════════════════════════════════════════
       REGLAS DE INTERPRETACIÓN
       Edita los umbrales numéricos para ajustar la sensibilidad.
    ═══════════════════════════════════════════════════════════════ */
    const REGLAS = {
        tienePrisa:     () => tiempoTotalSeg() < 60,
        esContemplatvo: () => tiempoTotalSeg() > 300,
        perfilTecnico: () => {
            const t = tiempoEnCategoria('tecnico');
            return t > tiempoEnCategoria('diseno') || t > tiempoEnCategoria('ilustracion') || paginasEnCategoria('tecnico') >= 2;
        },
        perfilVisual: () => {
            const t = tiempoEnCategoria('diseno') + tiempoEnCategoria('ilustracion');
            return t > tiempoEnCategoria('tecnico') * 1.5;
        },
        explorador:     () => estado.paginas.length >= 5,
        puntual:        () => estado.paginas.length <= 2,
        vioContacto:    () => estado.paginas.some(p => p.url === '/contacto/'),
        vioCV:          () => estado.paginas.some(p => p.url === '/acerca-de-soto/'),
        esLector:       () => scrollMedioGlobal() > 75,
        esEscaner:      () => velocidadMediaGlobal() > 900,
        scrollPausado:  () => { const v = velocidadMediaGlobal(); return v > 0 && v < 200; },
        clickerActivo:  () => estado.totalClics > 8,
        soloMiro:       () => !estado.dispositivoTactil && estado.totalClics <= 2,
        esTactil:       () => estado.dispositivoTactil,
        entroDirecto:   () => estado.paginas[0]?.categoria !== 'inicio',
        vioIlustracion: () => paginasEnCategoria('ilustracion') >= 1,
    };

    /* ═══════════════════════════════════════════════════════════════
       TEXTOS DEL INFORME
       Edita los strings libremente. <strong> = énfasis en azul.
    ═══════════════════════════════════════════════════════════════ */
    const TEXTOS = {
        apertura: () => {
            const n = estado.paginas.length;
            const t = fmtTiempo(tiempoTotalSeg());
            return `<strong>${n} página${n !== 1 ? 's' : ''}</strong> en <strong>${t}</strong>.`;
        },
        ritmo_rapido:        `Visita de reconocimiento. Entraste, escaneaste, sacaste conclusión. <strong>Ya sabías lo que buscabas antes de llegar.</strong>`,
        ritmo_contemplativo: `Te tomaste tu tiempo — más de lo habitual. Eso puede significar que algo aquí te retuvo genuinamente, o que eres alguien que <strong>no decide sin leer hasta el final.</strong>`,
        ritmo_normal:        `Velocidad de crucero. Ni prisa ni parsimonia. Una visita <strong>deliberada.</strong>`,
        perfil_tecnico:      `Pasaste más tiempo donde el proceso importa tanto como el resultado: las apps, los sistemas, la IA. <strong>Lo que te atrae aquí no es solo la forma — es cómo funciona por dentro.</strong>`,
        perfil_visual:       `Tu recorrido gravitó hacia los proyectos de identidad e ilustración. <strong>Piensas primero en imágenes.</strong>`,
        perfil_mixto:        `Distribuiste la atención entre lo técnico y lo visual sin una inclinación clara. <strong>No tienes perfil fácil de etiquetar</strong> — probablemente eso sea tu rasgo más útil.`,
        explorador:          (n) => `Entraste en <strong>${n} páginas</strong>. Eso es curiosidad sistemática, no curiosidad casual.`,
        puntual:             `Fuiste directo. Una o dos páginas y ya tenías suficiente. <strong>Eficiencia, o indiferencia.</strong> Difícil saberlo desde aquí.`,
        lector:              `Scrolleaste hasta el fondo en casi todo lo que viste. <strong>Eres de los que leen los créditos.</strong>`,
        escaner:             `Tu scroll fue rápido. Lees en diagonal, capturas lo esencial y sigues. <strong>Conoces ese modo — lo usas con propósito.</strong>`,
        scroll_pausado:      `Fuiste despacio. Paraste en las cosas. <strong>Atención, no impaciencia.</strong>`,
        clicker:             `Hiciste bastantes clics exploratorios. <strong>Tocas para entender.</strong>`,
        solo_miro:           `Casi no tocaste nada. Visitante de galería: observas desde la distancia antes de decidir si algo merece más.`,
        vio_cv:              `Revisaste el CV. Alguien está <strong>evaluando si merece la pena continuar la conversación.</strong>`,
        vio_contacto:        `Llegaste a la página de contacto. <strong>Eso no es accidente.</strong>`,
        entro_directo:       `Llegaste directo a un proyecto, sin pasar por el inicio. Alguien te mandó aquí, o sabías exactamente adónde ir.`,
        ilustracion:         `Dedicaste tiempo a la ilustración. La parte más personal del trabajo — la menos encargada, la más propia.`,
        cierre: () => {
            const hora = new Date(estado.inicio);
            const h = hora.getHours().toString().padStart(2, '0');
            const m = hora.getMinutes().toString().padStart(2, '0');
            return `Llegaste a las ${h}:${m}. Todo lo de arriba ocurrió en tu navegador. <strong>Nada salió de aquí.</strong>`;
        },
        firma: `— soto³`,
    };

    /* ─────────────────────────────────────────────────────────────────
       GENERAR INFORME
    ──────────────────────────────────────────────────────────────────── */
    function generarInforme() {
        registroPagina.salida = Date.now();
        guardarSesion(estado);

        const frags = [];
        frags.push(TEXTOS.apertura());

        if      (REGLAS.tienePrisa())          frags.push(TEXTOS.ritmo_rapido);
        else if (REGLAS.esContemplatvo())       frags.push(TEXTOS.ritmo_contemplativo);
        else                                    frags.push(TEXTOS.ritmo_normal);

        if      (REGLAS.perfilTecnico() && !REGLAS.perfilVisual())  frags.push(TEXTOS.perfil_tecnico);
        else if (REGLAS.perfilVisual()  && !REGLAS.perfilTecnico()) frags.push(TEXTOS.perfil_visual);
        else                                                          frags.push(TEXTOS.perfil_mixto);

        if      (REGLAS.explorador()) frags.push(TEXTOS.explorador(estado.paginas.length));
        else if (REGLAS.puntual())    frags.push(TEXTOS.puntual);

        if      (REGLAS.esLector())      frags.push(TEXTOS.lector);
        else if (REGLAS.esEscaner())     frags.push(TEXTOS.escaner);
        else if (REGLAS.scrollPausado()) frags.push(TEXTOS.scroll_pausado);

        if (!REGLAS.esTactil()) {
            if      (REGLAS.clickerActivo()) frags.push(TEXTOS.clicker);
            else if (REGLAS.soloMiro())      frags.push(TEXTOS.solo_miro);
        }

        if (REGLAS.entroDirecto())    frags.push(TEXTOS.entro_directo);
        if (REGLAS.vioCV())           frags.push(TEXTOS.vio_cv);
        if (REGLAS.vioContacto())     frags.push(TEXTOS.vio_contacto);
        if (REGLAS.vioIlustracion())  frags.push(TEXTOS.ilustracion);

        frags.push(TEXTOS.cierre());
        frags.push(TEXTOS.firma);

        const listaPags = estado.paginas
            .map(p => {
                const dur = ((p.salida || Date.now()) - p.entrada) / 1000;
                return `<span class="soto-raw-item"><span>${p.nombre}</span><span class="soto-raw-val">${fmtTiempo(dur)} · scroll ${Math.round(p.scrollMax)}%</span></span>`;
            })
            .join('');

        mostrarModal(frags, listaPags);
        estado.informeGenerado = true;
        guardarSesion(estado);
    }

    /* ═══════════════════════════════════════════════════════════════
       MICROTEXTOS EN TIEMPO REAL
       ───────────────────────────────────────────────────────────────
       Mensajes contextuales que aparecen durante la navegación.
       Todas las condiciones usan tiempoEnPaginaSeg() — tiempo desde
       que entró A ESTA PÁGINA, no al sitio completo. Así los mensajes
       de tiempo son siempre coherentes con lo que el visitante siente.

       MICRO_TIEMPO_VISIBLE  — ms que permanece visible cada mensaje
       MICRO_COMPROBACION    — ms entre evaluaciones de condiciones
       MICRO_DELAY_INICIO    — ms antes de empezar a evaluar
    ═══════════════════════════════════════════════════════════════ */

    /* ── Configuración de tiempos ── */
    const MICRO_TIEMPO_VISIBLE = 5000;   // 5 s visible
    const MICRO_COMPROBACION   = 2000;   // evalúa cada 2 s
    const MICRO_DELAY_INICIO   = 5000;   // espera 5 s antes de activarse

    /* ── Variables de estado ── */
    let microActivo            = false;
    let microUltimoMov         = Date.now();
    let microUltimoScroll      = Date.now();
    let microScrollBajo        = false;
    let microScrollInverso     = false;  // true durante 3s tras detectar scroll inverso real
    let microScrollY           = window.scrollY;
    let microIndiceDespl       = 0;
    let microPaginasVisitadas  = estado.paginas.length; // páginas al entrar a esta

    /* ──────────────────────────────────────────────────────────────
       TEXTOS ROTATIVOS PARA DESPLEGABLES
       Se muestra uno diferente cada vez que abre un proyecto.
       Edita los strings del array para cambiarlos.
    ────────────────────────────────────────────────────────────── */
    const TEXTOS_DESPLEGABLE = [
        "Curioso. Eso no lo hace todo el mundo.",
        "Bien. Los detalles importan.",
        "Eso tiene más dentro de lo que parece.",
    ];

    /* ──────────────────────────────────────────────────────────────
       MICROTEXTOS_GLOBAL
       ──────────────────────────────────────────────────────────────
       Cada entrada:
         texto      — string que aparece
         condicion  — función → true cuando debe mostrarse
         disparado  — flag interno, no tocar
         repetible  — si true, puede dispararse más de una vez

       IMPORTANTE: todas las condiciones de tiempo usan
       tiempoEnPaginaSeg() para medir tiempo EN ESTA PÁGINA,
       no en toda la sesión.
    ────────────────────────────────────────────────────────────── */
    const MICROTEXTOS_GLOBAL = [

        {
            /* INACTIVIDAD CORTA
               15 s sin moverse ni scrollear en esta página */
            texto: "Sé que sigues ahí. Tómate tu tiempo.",
            condicion() {
                const inactivo = Date.now() - microUltimoMov    > 15000
                              && Date.now() - microUltimoScroll > 15000;
                return inactivo && tiempoEnPaginaSeg() > 10;
            },
            disparado: false,
        },

        {
            /* INACTIVIDAD LARGA
               35 s sin moverse en esta página */
            texto: "¿Pensando? Bien. Es la respuesta correcta.",
            condicion() {
                return Date.now() - microUltimoMov    > 35000
                    && Date.now() - microUltimoScroll > 35000
                    && tiempoEnPaginaSeg() > 30;
            },
            disparado: false,
        },

        {
            /* SCROLL INVERSO INTENCIONAL
               Subió más de 200px de golpe después de haber bajado */
            _veces: 0,
            condicion() { return microScrollInverso; },
            repetible: true,
            disparado: false,
            getTexto() {
                this._veces++;
                return this._veces % 2 === 1
                    ? "Volviste. Algo te quedó pendiente."
                    : "Segunda mirada. Las mejores decisiones se toman así.";
            },
        },

        {
            /* LLEVA 45 S EN ESTA PÁGINA
               Tiempo real en la página actual, no en el sitio */
            texto: "Llevas un rato aquí. Eso significa algo.",
            condicion() {
                return tiempoEnPaginaSeg() > 45
                    && metaPagina.categoria !== 'inicio';
            },
            disparado: false,
        },

        {
            /* LLEVA 2 MIN EN ESTA PÁGINA */
            texto: "Sigues aquí. Ya somos amigos.",
            condicion() {
                return tiempoEnPaginaSeg() > 120
                    && metaPagina.categoria !== 'inicio';
            },
            disparado: false,
        },

        {
            /* LLEGÓ AL FINAL — scroll > 88% en esta página */
            texto: "Llegaste hasta abajo. Eso ya dice mucho de ti.",
            condicion() {
                const docH = document.documentElement.scrollHeight - window.innerHeight;
                const pct  = docH > 0 ? (window.scrollY / docH) * 100 : 0;
                return pct >= 88;
            },
            disparado: false,
        },

        {
            /* SEGUNDA PÁGINA O MÁS — está navegando el sitio */
            texto: "Ya vas por varias páginas. Bien.",
            condicion() {
                return estado.paginas.length > microPaginasVisitadas + 1
                    && estado.paginas.length >= 3;
            },
            disparado: false,
        },
    ];

    /* ── Motor de microtextos ── */
    function mostrarMicro(texto) {
        if (!texto) return;
        const el = document.getElementById('soto-microtexto');
        if (!el) return;
        microActivo = true;
        el.textContent = texto;
        el.classList.add('soto-micro-visible');
        setTimeout(() => {
            el.classList.remove('soto-micro-visible');
            setTimeout(() => { microActivo = false; }, 700);
        }, MICRO_TIEMPO_VISIBLE);
    }

    function evaluarMicros() {
        if (microActivo) return;
        for (const m of MICROTEXTOS_GLOBAL) {
            const listo = m.repetible ? !microActivo : !m.disparado;
            if (listo && m.condicion()) {
                if (!m.repetible) m.disparado = true;
                mostrarMicro(m.getTexto ? m.getTexto() : m.texto);
                break;
            }
        }
    }

    /* ── Inyección de estilos y contenedor ── */
    function inyectarEstilosMicrotexto() {
        if (document.getElementById('soto-micro-styles')) return;
        const style = document.createElement('style');
        style.id = 'soto-micro-styles';
        style.textContent = `
            #soto-microtexto {
                position: fixed;
                bottom: calc(34px + 32px);
                left: 50%;
                transform: translateX(-50%) translateY(14px);
                width: max-content;
                max-width: min(480px, 88vw);
                background: #141210;
                padding: 13px 20px;
                font-family: "Lexend", sans-serif;
                font-size: 11px;
                font-weight: 500;
                line-height: 1.65;
                color: rgba(240,236,231,0.82);
                z-index: 8600;
                opacity: 0;
                transition: opacity 0.5s ease, transform 0.5s ease;
                pointer-events: none;
                font-style: italic;
                letter-spacing: 0.01em;
            }
            #soto-microtexto.soto-micro-visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            @media (max-width: 768px) {
                #soto-microtexto {
                    max-width: 86vw;
                    font-size: 10px;
                    padding: 11px 16px;
                }
            }
            .soto-modal-obra {
                margin-top: 40px;
                padding-top: 28px;
                border-top: 1px solid rgba(240,236,231,0.07);
            }
            .soto-modal-obra p {
                font-family: "Lexend", sans-serif;
                font-size: 11px;
                font-weight: 300;
                line-height: 1.85;
                color: rgba(240,236,231,0.38);
                margin-bottom: 12px;
                font-style: italic;
                max-width: 420px;
            }
            .soto-modal-obra p strong {
                color: rgba(240,236,231,0.6);
                font-weight: 500;
                font-style: normal;
            }
            .soto-obra-cta {
                display: inline-block;
                font-family: "Lexend", sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #0011ff;
                text-decoration: none;
                font-style: normal;
                margin-top: 4px;
                margin-bottom: 20px;
                letter-spacing: 0.01em;
                transition: gap 0.2s, opacity 0.2s;
            }
            .soto-obra-cta:hover {
                opacity: 0.75;
            }
            .soto-obra-firma {
                font-family: "Lexend", sans-serif;
                font-size: 11px !important;
                font-weight: 700 !important;
                letter-spacing: 0.04em;
                color: rgba(240,236,231,0.25) !important;
                font-style: normal !important;
                margin-top: 4px !important;
            }
        `;
        document.head.appendChild(style);
    }

    function inyectarContenedorMicrotexto() {
        if (document.getElementById('soto-microtexto')) return;
        const el = document.createElement('div');
        el.id = 'soto-microtexto';
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }

    /* ── Listeners de microtextos ── */
    function iniciarListenersMicro() {
        document.addEventListener('mousemove',  () => { microUltimoMov = Date.now(); }, { passive: true });
        document.addEventListener('touchstart', () => { microUltimoMov = Date.now(); }, { passive: true });

        document.addEventListener('scroll', () => {
            const y   = window.scrollY;
            const dif = microScrollY - y;

            /* Scroll inverso real: sube más de 200px de golpe */
            if (dif > 200 && microScrollBajo && !microScrollInverso) {
                microScrollInverso = true;
                setTimeout(() => { microScrollInverso = false; }, 3000);
            }

            if (y > microScrollY) microScrollBajo = true;
            microScrollY      = y;
            microUltimoScroll = Date.now();
            microUltimoMov    = Date.now();
        }, { passive: true });

        /* Desplegables — texto rotativo al abrir */
        document.querySelectorAll('.proj-row, [data-expandable]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;
                /* Solo dispara al ABRIR, no al cerrar */
                if (!row.classList.contains('open') && !microActivo) {
                    const txt = TEXTOS_DESPLEGABLE[microIndiceDespl % TEXTOS_DESPLEGABLE.length];
                    microIndiceDespl++;
                    setTimeout(() => mostrarMicro(txt), 350);
                }
            });
        });

        /* Intervalo principal — arranca tras MICRO_DELAY_INICIO */
        setTimeout(() => {
            setInterval(evaluarMicros, MICRO_COMPROBACION);
        }, MICRO_DELAY_INICIO);
    }

    function iniciarMicrotextos() {
        inyectarEstilosMicrotexto();
        inyectarContenedorMicrotexto();
        iniciarListenersMicro();
    }

    /* ─────────────────────────────────────────────────────────────────
       UI: BOTÓN FLOTANTE Y MODAL
    ──────────────────────────────────────────────────────────────────── */
    function inyectarUI() {
        const btn = document.createElement('button');
        btn.id = 'soto-tracker-btn';
        btn.setAttribute('aria-label', 'Ver informe de visita');
        btn.innerHTML = `
            <span class="soto-btn-dot"></span>
            <span class="soto-btn-label">Tu visita</span>
        `;
        btn.addEventListener('click', generarInforme);
        document.body.appendChild(btn);

        const modal = document.createElement('div');
        modal.id = 'soto-informe-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="soto-modal-backdrop"></div>
            <div class="soto-modal-panel" role="dialog" aria-modal="true" aria-label="Informe de visita">
                <div class="soto-modal-header">
                    <span class="soto-modal-eyebrow">Tu visita · soto³</span>
                    <button class="soto-modal-close" aria-label="Cerrar">✕</button>
                </div>
                <div class="soto-modal-body">
                    <div id="soto-report-lines"></div>
                    <div class="soto-modal-data">
                        <span class="soto-data-label">Recorrido</span>
                        <div id="soto-report-pages"></div>
                    </div>
                    <div class="soto-modal-obra">
                        <p>Y ahora la parte importante.</p>
                        <p>Acabas de dejarme ver cómo piensas, qué te detiene, qué ignoras. Eso me dice más que cualquier briefing. Y lo que vi me dice que sé exactamente lo que buscas.</p>
                        <p>No hace falta que me lo expliques. <strong>Ya lo sé.</strong></p>
                        <a href="/contacto/" class="soto-obra-cta">Hablamos. →</a>
                        <p class="soto-obra-firma">soto.</p>
                    </div>
                    <p class="soto-privacy-note">
                        Todo el procesamiento ocurrió en tu navegador.
                        Nada fue enviado a ningún servidor.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.soto-modal-backdrop').addEventListener('click', cerrarModal);
        modal.querySelector('.soto-modal-close').addEventListener('click', cerrarModal);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
    }

    function mostrarModal(fragmentos, listaPags) {
        const modal = document.getElementById('soto-informe-modal');
        document.getElementById('soto-report-lines').innerHTML = fragmentos
            .map(f => `<p class="soto-report-line">${f}</p>`)
            .join('');
        document.getElementById('soto-report-pages').innerHTML = listaPags;

        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('soto-modal-visible');
        document.body.classList.add('soto-no-scroll');

        modal.querySelectorAll('.soto-report-line').forEach((el, i) => {
            el.style.transitionDelay = `${i * 80}ms`;
            requestAnimationFrame(() => el.classList.add('soto-line-in'));
        });
    }

    function cerrarModal() {
        const modal = document.getElementById('soto-informe-modal');
        modal.classList.remove('soto-modal-visible');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('soto-no-scroll');
    }

    /* ─────────────────────────────────────────────────────────────────
       INIT
    ──────────────────────────────────────────────────────────────────── */
    function init() {
        inyectarUI();
        iniciarMicrotextos();
        setTimeout(() => {
            const btn = document.getElementById('soto-tracker-btn');
            if (btn) btn.classList.add('soto-btn-ready');
        }, 1400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
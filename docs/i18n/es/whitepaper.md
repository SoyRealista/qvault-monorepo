# ⬡ QVAULT — El Protocolo Comunitario a Prueba de Cuántica

**Whitepaper · Versión 1.1 — Junio 2026**
Token: `$QVLT` | Red: Solana | Comunidad primero · DeFi · Conciencia cuántica

> Este documento tiene únicamente fines informativos y no constituye asesoramiento financiero, de inversión, legal ni fiscal.

---

## 1. Resumen ejecutivo

QVAULT (`$QVLT`) es un protocolo cripto centrado en la comunidad, construido en la intersección de tres narrativas potentes: **seguridad resistente a la cuántica, finanzas descentralizadas (DeFi) y crecimiento orgánico de comunidad.**

Sobre el sector pende un riesgo estructural a largo plazo: **la computación cuántica.** La investigación pública —incluido el trabajo del equipo Quantum AI de Google— ha *reducido* sustancialmente durante 2024–2025 los recursos cuánticos estimados para romper la criptografía de clave pública (RSA, ECDSA) que protege la mayoría de las blockchains. Aunque hoy no existe un ordenador cuántico criptográficamente relevante, lo que importa es la trayectoria de la investigación: la amenaza es creíble y la ventana para prepararse es finita.

La misión de QVAULT es convertirse en el hogar de los participantes cripto con visión de futuro que entienden este riesgo y quieren ser parte de la solución. Más que lanzar otro token, construimos un movimiento: una comunidad de holders, builders y creyentes que lideran la transición hacia unas finanzas a prueba de cuántica.

`$QVLT` se lanza en **Solana** por su velocidad, comisiones bajas y comunidad retail vibrante. El token implementa **Tokenomics 2.0**: captura de valor por comisiones, presión de recompra-y-quema (buyback-and-burn) y gobernanza on-chain que da a la comunidad poder real sobre la evolución del protocolo, incluida la hoja de ruta a largo plazo hacia una Layer 1 propia resistente a la cuántica.

| | |
|---|---|
| **Ticker del token** | `$QVLT` |
| **Blockchain** | Solana (Fase 1) → L1 propia (Fase 3) |
| **Suministro total** | 1.000.000.000 QVLT (fijo) |
| **Estándar de token** | SPL Token (Solana Program Library) |
| **Narrativa central** | Seguridad cuántica + DeFi + Comunidad |
| **Modelo de lanzamiento** | Fair Launch + pool de liquidez en Raydium |

---

## 2. El problema

### 2.1 La amenaza cuántica es creíble

Los cimientos criptográficos de las blockchains actuales —en particular el Algoritmo de Firma Digital de Curva Elíptica (ECDSA)— son, en principio, vulnerables a un ordenador cuántico suficientemente potente que ejecute el algoritmo de Shor.

Es clave que la investigación revisada por pares reciente ha venido **reduciendo** el coste estimado de tal ataque. En 2025, trabajos asociados al equipo Quantum AI de Google rebajaron —en aproximadamente un orden de magnitud— el número de qubits que antes se creían necesarios para romper RSA-2048. Diversos comentaristas independientes han elaborado estimaciones ilustrativas que sugieren que las claves expuestas en blockchains podrían llegar a estar en riesgo antes de lo que se asumía.

> **Sobre las fuentes:** estas cifras provienen de investigación y análisis de terceros y se presentan como *indicadores direccionales*, no como hechos consolidados. Los plazos exactos son inciertos y objeto de debate. QVAULT no afirma que ninguna blockchain haya sido vulnerada a día de hoy. Citamos la tendencia de la investigación para explicar *por qué prepararse importa ahora*. Las referencias completas se mantienen en `qvault.es/research`.

Una parte significativa de las cripto en circulación reside en direcciones con claves públicas expuestas, las más directamente vulnerables a un futuro adversario cuántico. El resto del ecosistema, de varios billones de dólares, comparte la misma dependencia estructural de la criptografía pre-cuántica.

### 2.2 El mercado no tiene una comunidad unificada

Existen proyectos especializados en resistencia cuántica (QRL, QANplatform, Algorand y otros). Son técnicamente capaces, pero les ha costado construir comunidades retail grandes y comprometidas: fuertes en ingeniería, más débiles en cultura. **La narrativa cuántica necesita un hogar, una tribu.**

A la vez, los participantes de DeFi buscan cada vez más proyectos con utilidad real (staking, reparto de comisiones, gobernanza) frente a la mera especulación.

### 2.3 La oportunidad

Hoy ningún proyecto combina (1) la urgencia de la narrativa de resistencia cuántica, (2) la utilidad financiera de los mecanismos DeFi y (3) una comunidad vibrante impulsada por la cultura. **QVAULT cubre ese hueco.**

---

## 3. La solución QVAULT

### 3.1 Un protocolo de tres capas

**Capa 1 — Comunidad y cultura.** Una comunidad global unida por la convicción de que unas finanzas a prueba de cuántica son inevitables. Gobernanza vía la DAO de QVAULT, donde los holders de `$QVLT` votan mejoras, asignaciones de tesorería y alianzas. Ventajas para holders: acceso temprano a herramientas, formación y oportunidades del ecosistema.

**Capa 2 — Utilidad DeFi.** Staking con rendimientos competitivos y ajustables por la DAO; un modelo de captura de valor por comisiones; presión deflacionaria por recompra-y-quema; e incentivos de liquidez en Raydium y Orca.

**Capa 3 — Hoja de ruta de seguridad cuántica.**
- *Fase 1:* Desplegar `$QVLT` en Solana con herramientas de concienciación post-cuántica para la comunidad.
- *Fase 2:* Lanzar el QVAULT Security Suite — un kit de código abierto que ayuda a los protocolos a evaluar y planificar la migración de su exposición cuántica.
- *Fase 3:* Desplegar una Layer 1 propia con criptografía post-cuántica estandarizada por el NIST (CRYSTALS-Dilithium / SPHINCS+), gobernada por la DAO de QVAULT.

### 3.2 ¿Por qué Solana en la Fase 1?

Solana ofrece alto rendimiento, comisiones inferiores al céntimo y una de las comunidades retail más activas de cripto: el trampolín ideal. Las comisiones bajas son esenciales para un token comunitario basado en staking frecuente y micro-transacciones.

---

## 4. Tokenomics

### 4.1 Distribución del suministro

Suministro total: **1.000.000.000 `$QVLT`** — fijo, sin emisión adicional tras el génesis.

| Asignación | % | Tokens | Vesting |
|---|---|---|---|
| Fair Launch público | 40% | 400.000.000 | Sin bloqueo |
| Recompensas Comunidad y Ecosistema | 25% | 250.000.000 | Vesting lineal 36 meses |
| Tesorería / DAO | 15% | 150.000.000 | Controlado por la DAO |
| Equipo y Asesores | 10% | 100.000.000 | Cliff 12 meses + 24 meses |
| Provisión de Liquidez | 7% | 70.000.000 | Bloqueado por el protocolo |
| Socios Estratégicos | 3% | 30.000.000 | Cliff 6 meses + 18 meses |

> Todo el vesting y la distribución se aplican on-chain (vesting lineal con cliff, distribución controlada por la tesorería). Véanse las instrucciones `create_vesting` / `claim_vested` y la retirada de tesorería del protocolo.

### 4.2 Mecánica de comisiones (Tokenomics 2.0)

El valor de las comisiones del protocolo se asigna así:

- **40% → recompensas de staking** — financiando el pool que paga a los stakers.
- **20% → recompra-y-quema** — retirando `$QVLT` del suministro de forma permanente (presión deflacionaria).
- **25% → tesorería de la DAO** — financiando desarrollo y grants.
- **15% → crecimiento del ecosistema y marketing.**

> **Nota de implementación:** las recompensas de staking se pagan desde la tesorería del protocolo a los APY publicados por tier y se reponen con la parte de las comisiones destinada a stakers. A medida que crece el uso, las comisiones sostienen el pool de recompensas. Los parámetros de recompensa son ajustables por la DAO y la financiación a largo plazo se gobierna de forma transparente (véanse factores de riesgo).

### 4.3 Tiers de staking

| Tier | Stake mínimo | APY objetivo | Ventajas |
|---|---|---|---|
| **Electron** | 10.000 QVLT | 8–12% | Reparto de comisiones + gobernanza |
| **Photon** | 50.000 QVLT | 14–20% | + Acceso temprano |
| **Qubit** | 250.000 QVLT | 22–30% | + Asiento en el consejo de la DAO |

Los APY son objetivos, fijados on-chain y ajustables por la gobernanza de la DAO. No son rendimientos garantizados.

---

## 5. Hoja de ruta

**Fase 1 — Lanzamiento y Comunidad (T3 2026).** Fair launch en Raydium; lanzamiento de comunidad (Discord, Telegram, X); staking activo (Electron y Photon); campaña de concienciación cuántica; primera votación de la DAO.

**Fase 2 — Expansión DeFi (T4 2026 – T1 2027).** QVAULT Security Suite v1.0; listados en CEX de nivel 2 (objetivos); programa de Grants; activación del tier Qubit; alianzas con grupos de investigación post-cuántica.

**Fase 3 — L1 propia (2027–2028).** Testnet de QVAULT Chain (firmas CRYSTALS-Dilithium); contratos inteligentes post-cuánticos; puente de migración de `$QVLT` desde Solana; mainnet gobernada por la DAO; despliegue de dApps de terceros.

---

## 6. Estrategia de comunidad

**Filosofía «comunidad primero».** QVAULT no es un proyecto que tiene una comunidad: es una comunidad que tiene un protocolo. Cada decisión prioriza la alineación a largo plazo de los holders frente a la especulación a corto.

**Mecánicas de crecimiento.** Programa de embajadores; incentivos por referidos; bounties de contenido; y un uso creíble de la cultura meme cripto.

**La educación como foso.** La amenaza cuántica es compleja y poco comprendida. QVAULT aspira a ser el recurso educativo de referencia: Briefings de Seguridad semanales, QVAULT Academy (cursos gratuitos de post-cuántica para público no técnico) y X Spaces mensuales con investigadores. Los holders informados se vuelven evangelistas; los evangelistas construyen movimientos.

---

## 7. Factores de riesgo

Participar en `$QVLT` conlleva riesgos significativos, entre ellos:

- **Riesgo de mercado** — los mercados cripto son muy volátiles; `$QVLT` puede perder valor sustancial.
- **Riesgo regulatorio** — la regulación cambiante puede afectar a las operaciones o a la utilidad del token.
- **Riesgo tecnológico** — la criptografía post-cuántica es un campo en evolución; los estándares pueden cambiar. Construir una L1 es complejo e intensivo en recursos.
- **Riesgo de ejecución** — los plazos de la hoja de ruta son estimaciones y pueden cambiar.
- **Riesgo de competencia** — otros podrían capturar la narrativa de seguridad cuántica.
- **Riesgo de contrato inteligente** — pese a las auditorías, los contratos pueden contener vulnerabilidades. Todo el código será de código abierto y auditado por terceros de prestigio antes de mainnet, y la autoridad de administración será un multisig.

QVAULT se compromete con la transparencia: actualizaciones periódicas, código abierto e informes públicos de tesorería.

---

## 8. Aviso legal

Este whitepaper se proporciona únicamente con fines informativos y no constituye asesoramiento financiero, de inversión, legal ni fiscal. La información puede cambiar sin previo aviso.

`$QVLT` es un token de utilidad diseñado para impulsar el protocolo y la gobernanza de QVAULT. No pretende constituir un valor (security) en ninguna jurisdicción. Los participantes deben consultar a asesores legales y financieros antes de adquirir cualquier token.

El equipo de QVAULT no ofrece garantías sobre la exactitud o integridad de este documento. El rendimiento pasado de cualquier criptomoneda no es indicativo de resultados futuros.

© 2026 QVAULT Protocol. Todos los derechos reservados.

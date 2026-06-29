# QVAULT — Cómo se maneja el ecosistema

Este documento explica, en lenguaje claro, quién controla qué y qué hay que
hacer (y qué se hace solo) para operar QVAULT después del lanzamiento.

---

## 1. Las "llaves" del reino — quién puede hacer qué

Hay **cuatro niveles de control**, de más humano a más automático:

| Nivel | Quién | Qué puede hacer | Riesgo |
|---|---|---|---|
| **Upgrade authority** | Multisig Squads | Cambiar el CÓDIGO del contrato | El más alto — idealmente se revoca tras estabilizar |
| **Admin** | Multisig Squads | Pausar, ajustar fees, buyback/burn, sacar del tesoro, crear vesting, ejecutar propuestas | Alto — por eso es multisig, nunca una sola persona |
| **Programa (PDA)** | Nadie / automático | Tiene la autoridad de mint y de los vaults | Ninguno — ningún humano puede acuñar más tokens ni mover los vaults a mano |
| **Comunidad** | Cualquiera | Hacer staking, reclamar, proponer, votar, reclamar vesting | Permissionless por diseño |

**La idea clave:** después del `initialize`, la autoridad para acuñar tokens
queda en manos del **programa**, no de una persona. El suministro está fijado
en 1.000M para siempre — nadie puede imprimir más. Lo único que una persona
(el multisig) puede tocar son las acciones de admin, y siempre con 2 de 3 firmas.

---

## 2. Los monederos que intervienen

1. **Phantom personal (deployer)** — paga el despliegue, es el admin inicial
   durante unos minutos, y luego **cede el control al multisig** (proceso de
   2 pasos: `transfer_admin` → el multisig hace `accept_admin`).
2. **Squads multisig (2 de 3)** — el "consejo" del protocolo. Controla admin y
   upgrade authority. Firmantes recomendados al principio: tú + 2 dispositivos/
   personas de confianza. Nunca las 3 llaves en el mismo sitio.
3. **Monederos de la comunidad** — los holders. No los controlamos nosotros.

---

## 3. Qué funciona solo vs. qué necesita un humano

### Se ejecuta solo (coste ~0€)
- **Web `qvlt.xyz`** — se redespliega sola en cada push (GitHub Actions).
- **Bots de X** — postean y responden en piloto automático (cron). Único coste:
  créditos de la API de X (vigilar el saldo).
- **Staking / claim / vesting** — los usuarios firman sus propias transacciones.
  No requieren que nosotros hagamos nada.
- **Mint fijo** — nadie tiene que "mantener" el suministro; está sellado.

### Necesita acción humana (multisig)
- **Recargar créditos de la API de X** cuando bajen.
- **Mantener el tesoro con fondos** para pagar recompensas de staking (las
  recompensas salen del tesoro; si se vacía, los claims fallan hasta recargar).
- **`distribute_fees`** — cuando entren ingresos del protocolo, alguien los
  deposita y reparte (40% stakers / 20% buyback / 25% DAO / 15% growth).
- **`execute_buyback_burn`** — ejecutar la quema de la parte de buyback.
- **`execute_proposal`** — tras una votación, el multisig ejecuta lo aprobado.
- **Seguridad** — vigilar el contrato y la comunidad (estafadores que clonan
  perfiles, CAs falsos, etc.).

---

## 4. El flujo del dinero (1.000M QVLT)

Todo el suministro se acuña al **tesoro** en el `initialize`. Desde ahí:

- **Fair launch (40% / 400M)** → se mueve con `withdraw_treasury` para el pool
  de Raydium / distribución pública.
- **Liquidez (7% / 70M)** → al pool Raydium, emparejado con SOL. Los **LP tokens
  se bloquean** (señal de no-rug).
- **Comunidad (25% / 250M)** → vesting lineal 36 meses.
- **Tesoro DAO (15% / 150M)** → se queda bajo control del tesoro/DAO.
- **Equipo (10% / 100M)** → vesting con cliff de 12 meses + 24 de liberación.
- **Partners (3% / 30M)** → vesting con cliff de 6 meses.

El vesting está **garantizado por el contrato**: `withdraw_treasury` no puede
sacar los tokens que respaldan un vesting activo (fix de la revisión de
seguridad del 11-jun).

---

## 5. Secuencia del día del lanzamiento (7 jul 2026)

1. `anchor build` + `anchor deploy --provider.cluster mainnet` (cuesta ~3-7 SOL).
2. Publicar IDL on-chain.
3. Correr `scripts/deploy.ts` → `initialize` (acuña 1B, crea vaults, metadata).
4. `create_vesting` para equipo / comunidad / partners (desde `deploy.config.json`).
5. `withdraw_treasury` → sacar la liquidez y crear el **pool Raydium $QVLT/SOL**.
6. **Bloquear los LP tokens.**
7. `transfer_admin` → nominar al multisig; el multisig hace `accept_admin`.
8. Verificar que TODAS las autoridades están en el multisig.
9. Publicar el **contract address (CA)** SOLO en canales oficiales (X, web).
   Avisar a la comunidad de los CAs falsos.
10. Lanzar el hilo de anuncio (ya programado en el bot).

> Nota: el staking puede abrirse el día 20 o unas semanas después (opción C de
> reducción de riesgo). El token + pool + comunidad es lo mínimo del día 1.

---

## 6. Lanzamiento SIN auditoría profesional — lo que asumimos

Vamos a mainnet sin auditoría externa (decisión consciente). Mitigaciones:
- Revisión manual a fondo del contrato (registro en `AUDIT.md`).
- Admin en multisig desde el minuto uno (ninguna llave única).
- Suministro fijo + sin freeze authority + vesting imposible de rugear.
- Transparencia total: código público, "auditoría programada post-launch".
- Empezar con liquidez modesta para limitar la superficie de riesgo.

El riesgo real existe: si hay un bug en staking/fees, hay fondos en juego. Por
eso conviene abrir el staking de forma escalonada y con cantidades pequeñas al
principio.

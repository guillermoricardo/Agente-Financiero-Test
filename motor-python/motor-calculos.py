"""
motor-calculos.py — Módulo 2 del agente de finanzas (asistente de Marta)

Cálculos deterministas + Monte Carlo del motor de análisis y recomendación.
Todos los valores de criterio (retornos, costes, inflación, carteras, bandas)
se cargan de SUPUESTOS, que transcribe reglas-recomendacion.md (R3, R5, R10).
Si las reglas cambian, cambiar SOLO este bloque.

Uso: python3 motor-calculos.py  → ejecuta el caso definido en __main__.
Para otro cliente: editar el bloque __main__ con los datos de su ficha.
"""

from __future__ import annotations   # permite `float | None` en Python 3.9

import numpy as np

# ─────────────────────────────────────────────────────────────────
# SUPUESTOS — transcripción de reglas-recomendacion.md (única fuente)
# ─────────────────────────────────────────────────────────────────

RETORNO_NOMINAL = {          # R5, escenario central, anual
    "liquidez": 0.02,
    "renta_fija": 0.03,
    "renta_variable": 0.065,
    "oro": 0.03,
}
COSTES_ANUALES = 0.004        # R5
INFLACION = 0.02              # R5
VOLATILIDAD = {               # R10 [estimado]
    "liquidez": 0.005,
    "renta_fija": 0.05,
    "renta_variable": 0.15,
    "oro": 0.15,
}
CORRELACION = {               # R10 [estimado]
    ("renta_variable", "renta_fija"): 0.1,
    ("renta_variable", "oro"): 0.0,
    ("renta_fija", "oro"): 0.2,
    # liquidez ≈ 0 con todo
}
CARTERAS_BASE = {             # R3
    "conservador": {"renta_variable": 0.20, "renta_fija": 0.60, "liquidez": 0.20},
    "moderado":    {"renta_variable": 0.50, "renta_fija": 0.40, "liquidez": 0.10},
    "dinamico":    {"renta_variable": 0.80, "renta_fija": 0.15, "liquidez": 0.05},
}
BANDAS_PROBABILIDAD = [       # R10
    (0.80, "Alta"), (0.65, "Razonable"), (0.50, "Frágil"), (0.0, "Baja"),
]
TASA_RETIRADA = {             # R6: horizonte de retirada (años) → tasa
    ">=40": 0.03, "~30": 0.0325, "~20": 0.04,
}
TOPE_APORTACION = (0.70, 0.80)   # R2: fracción del flujo libre

N_TRAYECTORIAS = 10_000       # R10 (mínimo)
SEMILLA = 42                  # reproducibilidad del informe


# ─────────────────────────────────────────────────────────────────
# Funciones del motor
# ─────────────────────────────────────────────────────────────────

def ajustar_cartera_por_plazo(perfil: str, plazo_anios: float) -> dict:
    """R3: la regla del plazo prevalece sobre el perfil.
    C2: frontera de banda → banda más conservadora.
    C3: puntos de RV retirados van a renta fija corta [estimado]."""
    base = dict(CARTERAS_BASE[perfil])
    if plazo_anios <= 3:                     # <3 y frontera 3 (C2)
        rv_max = 0.10
        recorte = max(0.0, base["renta_variable"] - rv_max)
    elif plazo_anios <= 7:
        recorte = 0.10                       # rango −10..−20 → prudente −10
        # C2: si se prefiere el extremo conservador del rango, usar 0.20
    else:
        recorte = 0.0
    base["renta_variable"] = round(base["renta_variable"] - recorte, 4)
    base["renta_fija"] = round(base["renta_fija"] + recorte, 4)  # C3 [estimado]
    assert abs(sum(base.values()) - 1.0) < 1e-9
    return base


def rentabilidad_cartera(pesos: dict) -> float:
    """R5: media ponderada por composición, neta de costes. Anual nominal."""
    bruta = sum(w * RETORNO_NOMINAL[c] for c, w in pesos.items())
    return bruta - COSTES_ANUALES


def volatilidad_cartera(pesos: dict) -> float:
    """Volatilidad anual de la cartera con las correlaciones de R10."""
    clases = list(pesos)
    var = 0.0
    for i, a in enumerate(clases):
        for j, b in enumerate(clases):
            if i == j:
                rho = 1.0
            else:
                rho = CORRELACION.get((a, b), CORRELACION.get((b, a), 0.0))
            var += pesos[a] * pesos[b] * VOLATILIDAD[a] * VOLATILIDAD[b] * rho
    return float(np.sqrt(var))


def flujo_libre(ingresos: float, gasto: float, cuotas_incluidas_en_gasto: bool,
                cuotas: float = 0.0) -> float:
    """R2 + C1."""
    return ingresos - gasto - (0.0 if cuotas_incluidas_en_gasto else cuotas)


def aportacion_propuesta(requerida: float, flujo: float,
                         colchon_completo: bool, provisiones_ok: bool) -> dict:
    """R2: meta manda, acotada al tope sostenible. C14: si la requerida cabe,
    se propone la requerida."""
    tope = flujo * (1.0 if (colchon_completo and provisiones_ok)
                    else TOPE_APORTACION[1])
    rango_sostenible = (flujo * TOPE_APORTACION[0], flujo * TOPE_APORTACION[1])
    if requerida is not None and requerida <= tope:
        propuesta = requerida
        viable = True
    else:
        propuesta = rango_sostenible
        viable = requerida is None or False
    return {"propuesta": propuesta, "rango_sostenible": rango_sostenible,
            "tope": tope, "viable": bool(viable)}


def vf_determinista(patrimonio: float, aportacion_mes: float,
                    r_anual: float, anios: float) -> float:
    """Proyección central: VF nominal con capitalización mensual."""
    r_m = (1 + r_anual) ** (1 / 12) - 1
    m = round(anios * 12)
    if r_m == 0:
        return patrimonio + aportacion_mes * m
    return patrimonio * (1 + r_m) ** m + aportacion_mes * ((1 + r_m) ** m - 1) / r_m


def a_euros_actuales(valor_nominal: float, anios: float) -> float:
    """R5: resultados en euros actuales (deflactar con inflación)."""
    return valor_nominal / (1 + INFLACION) ** anios


def anios_hasta_meta(patrimonio: float, aportacion_mes: float,
                     r_anual: float, objetivo_real: float,
                     max_anios: int = 100) -> float | None:
    """En cuántos años se alcanza el objetivo (en euros actuales)."""
    for m in range(1, max_anios * 12 + 1):
        anios = m / 12
        if a_euros_actuales(vf_determinista(patrimonio, aportacion_mes,
                                            r_anual, anios), anios) >= objetivo_real:
            return round(anios, 1)
    return None


def convertir_meta_renta(renta_mes_cartera: float, horizonte_retirada: str) -> float:
    """R6: solo la renta que debe generar LA CARTERA (ya neta de pensiones u
    otros ingresos previsibles). Nunca el 4 % automático."""
    return renta_mes_cartera * 12 / TASA_RETIRADA[horizonte_retirada]


def monte_carlo(patrimonio: float, aportacion_mes: float, pesos: dict,
                anios: float, objetivo_real: float | None = None) -> dict:
    """R10: ≥10.000 trayectorias mensuales lognormales a nivel cartera.
    Salida en euros actuales: percentiles p10/p50/p90 y probabilidad."""
    rng = np.random.default_rng(SEMILLA)
    mu, sigma = rentabilidad_cartera(pesos), volatilidad_cartera(pesos)
    m = round(anios * 12)
    mu_m = np.log(1 + mu) / 12          # log-retorno mensual del escenario central
    sigma_m = sigma / np.sqrt(12)
    z = rng.standard_normal((N_TRAYECTORIAS, m))
    factores = np.exp(mu_m - 0.5 * sigma_m**2 + sigma_m * z)
    valores = np.full(N_TRAYECTORIAS, float(patrimonio))
    for t in range(m):
        valores = valores * factores[:, t] + aportacion_mes
    reales = valores / (1 + INFLACION) ** anios
    out = {
        "p10": float(np.percentile(reales, 10)),
        "p50": float(np.percentile(reales, 50)),
        "p90": float(np.percentile(reales, 90)),
        "n": N_TRAYECTORIAS,
        "mu_cartera": mu, "sigma_cartera": sigma,
    }
    if objetivo_real is not None:
        p = float(np.mean(reales >= objetivo_real))
        out["prob_cumplimiento"] = p
        out["banda"] = next(b for umbral, b in BANDAS_PROBABILIDAD if p >= umbral)
    return out


def eur(x) -> str:
    return f"{round(x):,}".replace(",", ".") + " €"


# ─────────────────────────────────────────────────────────────────
# __main__ — caso de la ficha en análisis (editar por cliente)
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # ══ ficha-alex.md (2026-08-04) · ejecución 2026-08-06 ══
    ingresos, gasto = 3000.0, 2200.0          # [confirmado]
    patrimonio = 15000.0                      # 10.000 cuenta + 5.000 acciones Nasdaq
    liquidez_cuenta = 10000.0
    invertible = 5000.0                       # acciones Nasdaq (RV concentrada)
    colchon_meses = 4.0                       # rango 4-5 → prudente 4 (R9)
    colchon_eur = colchon_meses * gasto       # 8.800 €
    perfil = "conservador"                    # riesgo_perfil_derivado [confirmado]
    plazo = 3.0                               # frontera de banda → conservadora (C2)
    aportacion_actual_invertida = 0.0         # guarda 800 €/mes sin invertir (C11)

    # C1: aportacion_actual (800) = ingresos - gasto confirmada como remanente
    # → el gasto YA incluye las cuotas de deuda (1.000 €/mes): no restar de nuevo
    fl = flujo_libre(ingresos, gasto, cuotas_incluidas_en_gasto=True)
    print(f"Flujo libre: {eur(fl)}/mes")
    print(f"Colchón prudente (4 meses): {eur(colchon_eur)} · liquidez en cuenta: {eur(liquidez_cuenta)}")

    # R3: conservador, plazo 3 años (frontera) → RV <= 10 %
    cartera = ajustar_cartera_por_plazo(perfil, plazo)
    r = rentabilidad_cartera(cartera)
    vol = volatilidad_cartera(cartera)
    print(f"Cartera objetivo: {cartera}")
    print(f"Rentabilidad neta derivada (R5): {r*100:.2f} % · vol: {vol*100:.2f} %")

    # R2: colchón 4-5 dentro del rango 3-6 y >= límite inferior → cubierto (C4);
    # provisiones para irregulares sin confirmar → tope 80 %, no 100 %
    ap = aportacion_propuesta(requerida=None, flujo=fl,
                              colchon_completo=True, provisiones_ok=False)
    lo, hi = ap["rango_sostenible"]
    print(f"Aportación sostenible (R2, 70–80 %): {eur(lo)} – {eur(hi)}/mes · tope: {eur(ap['tope'])}")

    # R6: meta de renta de NEGOCIO → no convertible. Solo ILUSTRACIÓN condicionada:
    equivalente = convertir_meta_renta(5000.0, ">=40")
    print(f"[ILUSTRACIÓN R6] 5.000 €/mes si salieran de la cartera (retirada 3 %): {eur(equivalente)}")
    print(f"  Camino recorrido ilustrativo: {patrimonio/equivalente*100:.1f} %")

    # Proyección statu quo a 3 años (euros actuales):
    # 800 €/mes a cuenta al 0 % + 5.000 € en RV al retorno RV neto de costes
    r_rv = RETORNO_NOMINAL["renta_variable"] - COSTES_ANUALES
    cuenta_sq = a_euros_actuales(vf_determinista(liquidez_cuenta, 800.0, 0.0, plazo), plazo)
    rv_sq = a_euros_actuales(vf_determinista(invertible, 0.0, r_rv, plazo), plazo)
    print(f"Statu quo 3 años: cuenta {eur(cuenta_sq)} + Nasdaq {eur(rv_sq)} = total {eur(cuenta_sq + rv_sq)}")

    # Propuesta: aportación a la cartera 10/70/20 partiendo de los 5.000 €
    print("— Proyecciones propuesta (euros actuales, 3 años) —")
    for etiqueta, apm in [("propuesta baja", lo), ("propuesta alta", hi)]:
        vf = a_euros_actuales(vf_determinista(invertible, apm, r, plazo), plazo)
        mc = monte_carlo(invertible, apm, cartera, plazo)
        margen = fl - apm
        total = vf + a_euros_actuales(liquidez_cuenta, plazo)
        total_si_margen_ahorrado = total + a_euros_actuales(vf_determinista(0.0, margen, 0.0, plazo), plazo)
        print(f"  {etiqueta} ({eur(apm)}/mes): cartera central {eur(vf)} · "
              f"MC p10 {eur(mc['p10'])} / p50 {eur(mc['p50'])} / p90 {eur(mc['p90'])}")
        print(f"    total (cartera + 10.000 en cuenta): {eur(total)} · "
              f"si además guardara el margen de {eur(margen)}/mes: {eur(total_si_margen_ahorrado)}")

    # Probabilidad contra la cifra ilustrativa (R10) — incluso al 100 % del flujo
    print("— Probabilidad vs 2.000.000 € ilustrativos (R10) —")
    for etiqueta, apm in [("propuesta alta", hi), ("100 % flujo", fl)]:
        mc = monte_carlo(invertible, apm, cartera, plazo, equivalente)
        print(f"  {etiqueta} ({eur(apm)}/mes), 3 años: P = {mc['prob_cumplimiento']*100:.1f} % ({mc['banda']})")

    # R4 · ¿años hasta la cifra ilustrativa con el 100 % del flujo?
    n = anios_hasta_meta(invertible, fl, r, equivalente)
    print(f"Años hasta {eur(equivalente)} con {eur(fl)}/mes al {r*100:.2f} %: {n if n else '>100'}")

    # Dilución de la concentración Nasdaq con aportaciones nuevas (12 meses, sin rentabilidad)
    for apm in [lo, hi]:
        peso = invertible / (invertible + apm * 12)
        print(f"Peso Nasdaq tras 12 meses aportando {eur(apm)}/mes (sin rentab.): {peso*100:.0f} %")

"""
baseline.py — Oráculo de verificación del port a TypeScript.

Carga motor-calculos.py (el motor original) y vuelca a JSON, con precisión
completa, la salida de cada función para un conjunto de casos que cubre las
reglas R2, R3, R5, R6 y R10 y varios casos borde del catálogo C1–C16.

El resultado (baseline.json) se consume desde los tests de web/ para comprobar
que el motor TypeScript reproduce el original al céntimo.

Uso: python3 motor-python/baseline.py
"""

import importlib.util
import json
import pathlib

AQUI = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("motor", AQUI / "motor-calculos.py")
motor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(motor)

PERFILES = ["conservador", "moderado", "dinamico"]
# Plazos elegidos para tocar las tres bandas de R3 y sus dos fronteras (C2)
PLAZOS = [1.0, 2.9, 3.0, 5.0, 7.0, 7.1, 8.0, 10.0, 20.0]

out = {}

# ── R3 · cartera ajustada por plazo, y R5/R10 derivadas de esa cartera ──
carteras = []
for perfil in PERFILES:
    for plazo in PLAZOS:
        pesos = motor.ajustar_cartera_por_plazo(perfil, plazo)
        carteras.append({
            "perfil": perfil,
            "plazo": plazo,
            "pesos": pesos,
            "rentabilidad": motor.rentabilidad_cartera(pesos),
            "volatilidad": motor.volatilidad_cartera(pesos),
        })
out["carteras"] = carteras

# ── R5 · rentabilidad y volatilidad de las carteras base sin ajustar ──
out["carteras_base"] = [
    {
        "perfil": perfil,
        "pesos": motor.CARTERAS_BASE[perfil],
        "rentabilidad": motor.rentabilidad_cartera(motor.CARTERAS_BASE[perfil]),
        "volatilidad": motor.volatilidad_cartera(motor.CARTERAS_BASE[perfil]),
    }
    for perfil in PERFILES
]

# ── R2 + C1 · flujo libre ──
out["flujo_libre"] = [
    {"args": a, "resultado": motor.flujo_libre(*a)}
    for a in [
        (3000.0, 2200.0, True, 0.0),      # el gasto ya incluye cuotas (C1)
        (3000.0, 2200.0, False, 1000.0),  # cuotas aparte
        (2000.0, 2000.0, True, 0.0),      # flujo cero (C10 / R8)
        (1800.0, 2100.0, True, 0.0),      # flujo negativo (C10 / R8)
    ]
]

# ── R2 · aportación propuesta, incluido C14 (la requerida cabe en el tope) ──
out["aportacion_propuesta"] = [
    {"args": a, "resultado": motor.aportacion_propuesta(*a)}
    for a in [
        (None, 800.0, True, False),    # sin meta convertible → rango sostenible
        (None, 800.0, True, True),     # colchón y provisiones ok → tope 100 %
        (500.0, 800.0, True, False),   # C14: requerida ≤ tope → se propone la requerida
        (700.0, 800.0, True, False),   # requerida > tope 80 % → rango sostenible (R4)
        (640.0, 800.0, True, True),    # requerida ≤ tope 100 %
    ]
]

# ── Proyección determinista y deflactado (R5) ──
out["vf_determinista"] = [
    {"args": a, "resultado": motor.vf_determinista(*a)}
    for a in [
        (15000.0, 640.0, 0.031, 10.0),
        (5000.0, 560.0, 0.0246, 3.0),
        (10000.0, 800.0, 0.0, 3.0),     # tasa cero: rama sin capitalización
        (0.0, 250.0, 0.054, 20.0),      # C12: patrimonio cero
        (50000.0, 0.0, 0.043, 15.0),    # solo capital, sin aportaciones
    ]
]

out["a_euros_actuales"] = [
    {"args": a, "resultado": motor.a_euros_actuales(*a)}
    for a in [(100000.0, 10.0), (25000.0, 3.0), (1000000.0, 30.0)]
]

out["anios_hasta_meta"] = [
    {"args": a, "resultado": motor.anios_hasta_meta(*a)}
    for a in [
        (15000.0, 640.0, 0.031, 200000.0),
        (5000.0, 800.0, 0.0246, 100000.0),
        (0.0, 250.0, 0.054, 500000.0),
        (5000.0, 800.0, 0.0246, 2000000.0),   # inalcanzable en 100 años → None
    ]
]

# ── R6 · conversión de meta de renta ──
out["convertir_meta_renta"] = [
    {"args": a, "resultado": motor.convertir_meta_renta(*a)}
    for a in [
        (5000.0, ">=40"), (2000.0, "~30"), (1500.0, "~20"),
    ]
]

# ── R10 · Monte Carlo. Comparación estadística, no al céntimo:
#    numpy usa PCG64 y no es reproducible bit a bit fuera de numpy. ──
mc_casos = [
    {"patrimonio": 5000.0, "aportacion": 560.0, "perfil": "conservador",
     "plazo": 3.0, "objetivo": None},
    {"patrimonio": 5000.0, "aportacion": 640.0, "perfil": "conservador",
     "plazo": 3.0, "objetivo": 2000000.0},
    {"patrimonio": 15000.0, "aportacion": 500.0, "perfil": "moderado",
     "plazo": 20.0, "objetivo": 300000.0},
    {"patrimonio": 0.0, "aportacion": 300.0, "perfil": "dinamico",
     "plazo": 30.0, "objetivo": 400000.0},
]
mc = []
for c in mc_casos:
    pesos = motor.ajustar_cartera_por_plazo(c["perfil"], c["plazo"])
    r = motor.monte_carlo(c["patrimonio"], c["aportacion"], pesos,
                          c["plazo"], c["objetivo"])
    mc.append({"caso": c, "pesos": pesos, "resultado": r})
out["monte_carlo"] = mc

# ── Constantes de criterio, para verificar que el port no las alteró ──
out["supuestos"] = {
    "RETORNO_NOMINAL": motor.RETORNO_NOMINAL,
    "COSTES_ANUALES": motor.COSTES_ANUALES,
    "INFLACION": motor.INFLACION,
    "VOLATILIDAD": motor.VOLATILIDAD,
    "CARTERAS_BASE": motor.CARTERAS_BASE,
    "TASA_RETIRADA": motor.TASA_RETIRADA,
    "TOPE_APORTACION": list(motor.TOPE_APORTACION),
    "N_TRAYECTORIAS": motor.N_TRAYECTORIAS,
}

destino = AQUI / "baseline.json"
destino.write_text(json.dumps(out, indent=2, ensure_ascii=False))
print(f"Baseline escrito en {destino}")
print(f"  {len(carteras)} carteras · {len(mc)} casos Monte Carlo")

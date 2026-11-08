# Módulo técnico 6 — Sistema integrador de producción musical

**Trayecto:** Laboratorio técnico de audio e IA musical · TAMV Online Network
**Autor del curso:** Edwin Oswaldo Castillo Trejo · **Apoyo declarado:** IA para estructuración y revisión.
**Nivel:** avanzado · **Tiempo orientativo:** 12–16 horas.
**Resultado:** un sistema mínimo desplegado con arquitectura, persistencia, pruebas, monitoreo, respaldo y expediente de gobernanza.

## Competencia de salida

La persona estudiante integra los cinco módulos en un sistema operable: define contratos y estados, persiste trabajos con idempotencia, despliega con Docker y HTTPS, prueba restauración y defiende el sistema con métricas, límites y un fallo controlado.

## Lecciones

1. **Arquitectura, contratos y límites.** Componentes, entradas/salidas, estados y límites de duración, tamaño, cupo y hardware.
2. **Backend, base de datos y colas.** Modelo de datos, almacenamiento de objetos, idempotencia, reintentos y permisos por usuario.
3. **Docker, Nginx y HTTPS.** Imagen reproducible, configuración externa, TLS, salud, logs y respaldo probado.
4. **Pruebas, monitoreo y defensa.** Unitarias, integración, extremo a extremo, alertas accionables y guion de defensa.

## Laboratorio: estudio autónomo desplegado

1. Define arquitectura, contratos, estados y límites.
2. Implementa el flujo mínimo con persistencia e idempotencia.
3. Integra al menos un módulo técnico anterior y documenta su contrato.
4. Empaqueta con Docker y despliega con HTTPS.
5. Automatiza pruebas, salud y respaldo; prueba la restauración.
6. Prepara la defensa con demo, fallo controlado, métricas y riesgos.

## Comandos

```bash
python -m src.checklist_entrega --root proyecto_modulo_3
python -m unittest tests.test_gobernanza_y_sistemas -v
```

## Rúbrica (100 puntos)

| Criterio | Peso |
|---|---|
| Integración del sistema | 20 |
| Calidad musical y técnica | 15 |
| Reproducibilidad | 15 |
| Despliegue y operación | 15 |
| Pruebas y fallos | 10 |
| Gobernanza | 15 |
| Defensa y comunicación | 10 |

## Límites

El checklist verifica presencia y tamaño de artefactos, no calidad musical ni seguridad completa. Un despliegue sin restauración probada no está completo. La defensa debe declarar lo que no está implementado y no ocultar fallos.

# Gecko Native Binaries

Esta carpeta contiene los binarios compilados del motor Gecko (Firefox C ABI) para Windows 10 Mobile / UWP.

Están organizados por arquitectura:
- `native/arm/`: Para dispositivos físicos Windows 10 Mobile (ARM32).
- `native/x86/`: Para emuladores y pruebas en arquitectura x86.

## Archivos requeridos:
- `gecko_capi.dll`
- `xul.dll`
- `mozglue.dll`
- `omni.ja` (archivos de recursos y UI de Gecko)

Estos binarios se copian al paquete APPX final durante el proceso de compilación (tanto localmente como en GitHub Actions).

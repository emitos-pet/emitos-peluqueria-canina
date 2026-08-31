# Emitos Peluquería Canina — preparación productiva

Esta versión elimina los productos ficticios y prepara la aplicación para el catálogo real.

## Cambios
- Sin imágenes de productos, locales ni externas.
- CSP endurecida con `img-src 'none'`.
- Productos con precio `0` o sin precio quedan visibles como **No disponible** y no pueden agregarse al carrito.
- Nuevo `localStorage` (`emitos-cart-v2`) para no reutilizar el carrito de testing.
- Búsqueda por producto, marca, categoría, subcategoría, tipo y presentación.
- Filtros por categoría, tipo y marca.
- Presentaciones en kg, litros, unidades y packs.
- Se conservan observaciones como `Cantidad por bolsón: X unid.`.
- Correcciones de tipeo aprobadas incluidas en el generador.

## Carga del listado real
1. Copiar `listado_productos.md` a `data/listado_productos.md`.
2. Desde la raíz del repo ejecutar: `python tools/generar_productos.py data/listado_productos.md`
3. Verificar el resumen de productos generado.
4. Probar con Live Server antes de hacer commit/push.

## Seguridad
La CSP no permite imágenes (`img-src 'none'`) y mantiene scripts/estilos restringidos al mismo origen. El pedido de WhatsApp se reconstruye desde `PRODUCTS`, no desde el HTML visible. Como el sitio sigue siendo estático, precio y disponibilidad final se confirman por WhatsApp.

## QR
No generar todavía el QR definitivo. Se genera al final, una vez publicada y validada la URL definitiva.

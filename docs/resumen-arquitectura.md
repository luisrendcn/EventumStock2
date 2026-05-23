# Resumen para exposición: EventumStock2

## 1. Qué es el proyecto

EventumStock2 es un sistema de gestión de inventario para productos con lotes, vencimientos, códigos de barras y reservas temporales. El flujo central permite registrar entradas y salidas de inventario, reservar stock para pedidos, confirmar reservas, vencerlas automáticamente por TTL y emitir alertas cuando un producto queda por debajo de su umbral mínimo.

El proyecto tiene tres partes principales:

- API backend: expone los casos de uso del inventario y reservas.
- PWA administrativa: interfaz para operar productos, escaneo, lotes y reservas.
- E-commerce: interfaz de compra que consume las reservas y confirmaciones.

## 2. Stack tecnológico

- Backend: Node.js, TypeScript, Express.
- Validación HTTP: Zod.
- Base de datos persistente: PostgreSQL.
- Reservas temporales: Redis.
- Scheduler: node-cron.
- Notificaciones: Nodemailer con SMTP configurable.
- Frontend administrativo: React, Vite, Tailwind CSS.
- Frontend e-commerce: React, Vite, Tailwind CSS.
- Testing: Jest, ts-jest.
- Contenedores locales: Docker Compose para PostgreSQL y Redis.

## 3. Arquitectura usada

El backend aplica arquitectura hexagonal, también conocida como ports and adapters. La idea principal es que el dominio y los casos de uso no dependan directamente de frameworks, bases de datos, Redis, SMTP ni Express.

Capas principales:

- Dominio: entidades, eventos, value objects y contratos. Ejemplos: `Product`, `Reservation`, `TTL`, `StockLevel`, `Barcode`, `INotificationService`, `IProductRepository`.
- Aplicación: casos de uso que coordinan reglas del negocio. Ejemplos: `RegisterEntryUseCase`, `RegisterExitUseCase`, `CreateReservationUseCase`, `ConfirmReservationUseCase`, `ExpireReservationsUseCase`.
- Infraestructura: adaptadores concretos para tecnologías externas. Ejemplos: `PostgresProductRepository`, `RedisReservationRepository`, `EmailNotificationService`, `DatabaseBarcodeScanner`.
- Interfaces: capa HTTP con Express y rutas.
- Composición: `container.ts` conecta implementaciones reales con los casos de uso.

Esta estructura permite cambiar Redis, PostgreSQL, SMTP o Express sin reescribir el dominio.

## 4. Funcionalidades principales

- Gestión de productos con código de barras, SKU, categoría, precio, unidad y umbral mínimo.
- Gestión de lotes por producto, cantidad y fecha de vencimiento.
- Entrada de inventario con lote y fecha de vencimiento.
- Salida de inventario usando FEFO: primero salen los lotes con vencimiento más cercano.
- Registro inmutable de movimientos de inventario.
- Cálculo de stock disponible: stock total menos stock reservado.
- Reservas temporales para pedidos de e-commerce.
- Confirmación de reservas, que descuenta stock real.
- Cancelación o expiración automática de reservas.
- Alertas de bajo stock por correo cuando una salida deja el producto bajo el umbral.

## 5. Funcionalidad TTL aplicada

TTL significa Time To Live: cuánto tiempo vive una reserva antes de vencer.

En este proyecto se aplica así:

- El value object `TTL` valida que una reserva dure mínimo 2 minutos y máximo 24 horas.
- Si no se envía un TTL personalizado, se usa un valor por defecto de 15 minutos.
- `CreateReservationUseCase` calcula `expiresAt` con base en el TTL.
- Redis guarda las reservas activas y usa estructuras auxiliares para consultar vencidas.
- `TTLExpirationScheduler` ejecuta `ExpireReservationsUseCase` cada 30 segundos.
- Cuando una reserva vence, se marca como `EXPIRED` y deja de contar como stock reservado.

Esto evita vender stock bloqueado indefinidamente y mantiene sincronizado el inventario disponible.

## 6. Patrones de diseño aplicados

- Repository: `IProductRepository` y `IReservationRepository` abstraen el acceso a datos. PostgreSQL y Redis quedan como detalles de infraestructura.
- Adapter: `PostgresProductRepository`, `RedisReservationRepository`, `DatabaseBarcodeScanner` y `EmailNotificationService` adaptan servicios externos a contratos del dominio.
- Dependency Injection: los casos de uso reciben sus dependencias por constructor. Ejemplo: `RegisterExitUseCase` recibe repositorios y servicio de notificaciones.
- Factory: `NotificationServiceFactory` decide si usar email SMTP o consola según la configuración del entorno.
- Value Object: `Barcode`, `TTL` y `StockLevel` encapsulan validaciones y reglas pequeñas pero críticas.
- Domain Event: `StockUpdatedEvent` representa el cambio de stock y permite decidir si existe bajo stock.
- Scheduler: `TTLExpirationScheduler` ejecuta una tarea periódica separada del flujo HTTP.

## 7. Aplicación de principios SOLID

- Single Responsibility: cada caso de uso tiene una responsabilidad concreta. Por ejemplo, `CreateReservationUseCase` crea reservas, mientras `ExpireReservationsUseCase` expira reservas.
- Open/Closed: se puede agregar otro servicio de notificación, como WhatsApp o webhooks, implementando `INotificationService` sin modificar el caso de uso.
- Liskov Substitution: cualquier implementación de `IProductRepository`, `IReservationRepository` o `INotificationService` puede sustituir a otra si cumple el contrato.
- Interface Segregation: los puertos son pequeños y orientados a necesidades reales. Por ejemplo, `INotificationService` expone solo la alerta de bajo stock.
- Dependency Inversion: la aplicación depende de interfaces del dominio, no de PostgreSQL, Redis, Nodemailer o Express.

## 8. Encapsulamiento y reglas de negocio

El encapsulamiento aparece en varios puntos importantes:

- `TTL` oculta el número interno de segundos y solo permite crear valores válidos.
- `StockLevel` encapsula la fórmula de stock disponible y evita estados negativos.
- `Barcode` centraliza la validación de códigos EAN-13, EAN-8 y Code128.
- `Reservation` encapsula `remainingSeconds`, `isExpired` y cambios de estado con `withStatus`.
- `Product` expone `totalStock` e `isBelowThreshold` sin repetir cálculos en otras capas.

Esto reduce duplicación y evita que reglas críticas queden repartidas por controladores o componentes.

## 9. Atributos de calidad importantes

- Mantenibilidad: la separación hexagonal permite modificar infraestructura sin tocar reglas del negocio.
- Testabilidad: los casos de uso reciben interfaces, por eso se prueban con mocks sin levantar PostgreSQL, Redis ni SMTP.
- Escalabilidad: Redis maneja reservas temporales y consultas rápidas de stock reservado.
- Confiabilidad: la expiración periódica libera reservas vencidas y evita bloqueo indefinido de stock.
- Observabilidad básica: logs para conexiones, scheduler y fallos de notificación.
- Seguridad de configuración: las credenciales SMTP van por variables de entorno, no en código.
- Integridad de datos: PostgreSQL usa constraints, claves foráneas e índices; los movimientos son inmutables por trigger.
- Usabilidad: la API traduce varios errores técnicos a mensajes en español para la interfaz.
- Extensibilidad: nuevos adaptadores, como SMS, WhatsApp o un proveedor cloud de correo, pueden conectarse al mismo puerto.

## 10. Mejora implementada: notificaciones por correo

Antes, las alertas de bajo stock solo se imprimían en consola. Ahora existe un adaptador SMTP:

- `EmailNotificationService` construye y envía el correo de bajo stock.
- El destinatario configurado por defecto es `luisrendon1522@gmail.com`.
- `NotificationServiceFactory` usa SMTP cuando existen `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS`.
- Si SMTP no está configurado, el sistema usa `ConsoleNotificationService` para no romper el arranque local.
- Si el correo falla, la salida de inventario no se cancela; el error se registra en logs porque la notificación es un efecto secundario.

Variables principales:

```env
NOTIFICATION_EMAIL_TO=luisrendon1522@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="EventumStock <your_email@gmail.com>"
```

Para Gmail se recomienda usar una contraseña de aplicación, no la contraseña normal de la cuenta.

## 11. Idea corta para exponer

Este proyecto es un buen ejemplo de arquitectura hexagonal aplicada a inventario. El dominio define reglas como stock disponible, FEFO, TTL y bajo stock. La aplicación coordina casos de uso, mientras infraestructura conecta PostgreSQL, Redis, SMTP y Express. Gracias a los puertos, el sistema es testeable, extensible y más mantenible: se puede cambiar la forma de persistir reservas o enviar notificaciones sin reescribir la lógica central.

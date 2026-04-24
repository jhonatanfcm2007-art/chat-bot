# 📘 Manual de Configuración y Persistencia (¡LEER IMPORTANTE!)

Si sientes que el bot "pierde el progreso" o se borran los datos al actualizar, es porque **Railway** borra todos los archivos nuevos cada vez que se reinicia el servidor. Para solucionar esto y configurar tu bot como un profesional, sigue estos pasos:

## 1. 💾 Cómo evitar que se borren los datos (PERSISTENCIA)
Para que tu inventario y chats no se borren nunca, debes crear un **Volumen** en Railway:

1.  Entra a tu panel de **Railway**.
2.  Haz clic en tu servicio (el cuadro del bot).
3.  Ve a la pestaña **Settings** (Configuración).
4.  Busca la sección **Volumes** y haz clic en **Add Volume**.
5.  En **Mount Path**, escribe exactamente esto: `/app/server/data`
6.  ¡Listo! Ahora Railway guardará tus archivos JSON en un disco duro permanente que no se borra.

---

## 2. 🤖 Configuración del Bot (Lo que puedes editar hoy)
Actualmente puedes configurar el comportamiento del bot directamente desde la interfaz web (pestaña **AI Assistant**), pero aquí te explico cómo funciona el "cerebro":

### El Archivo de Instrucciones (System Prompt)
El bot sigue reglas que tú le das. Si quieres que sea más agresivo vendiendo o que no repita cosas, edita esto en el panel:
- **Personalidad**: Dile que sea breve y use emojis.
- **Estrategia**: Dile que ofrezca todas las cuentas aunque no haya stock.
- **Reglas de Pago**: Dile que pida siempre el comprobante para la garantía.

---

## 3. 📂 Estructura de Datos (Archivos Internos)
Si por alguna razón quieres ver los archivos crudos (dentro de la carpeta `server/data`), estos son:
- `inventory.json`: Tus cuentas y precios.
- `chats.json`: Todas las conversaciones e historial.
- `settings.json`: El prompt y configuraciones de IA.
- `sales.json`: El registro de todas tus ventas terminadas.

---

## 4. 📸 Imágenes y Audio
- Las imágenes de comprobantes se guardan en: `server/uploads/`
- Los audios se procesan en tiempo real y se borran después de transcribirlos para no llenar el disco.

---

**¿Por qué fallaba antes?**
Sin el "Volumen" de Railway (Paso 1), cada vez que yo (tu asistente) subía un cambio o tú reiniciabas el bot, Railway "limpiaba" la carpeta del servidor y volvía al estado de fábrica de tu código en GitHub. **Hacer el paso del Volumen es obligatorio para que el bot tenga memoria a largo plazo.**

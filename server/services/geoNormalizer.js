import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey && apiKey.length > 10) {
    genAI = new GoogleGenerativeAI(apiKey);
}

const SYSTEM_INSTRUCTION = `
Eres un analista logístico experto en geolocalización y toponimia de Centroamérica (Honduras, El Salvador y Costa Rica) para envíos contra entrega (Dropi).
Tu única tarea es recibir datos crudos de una dirección y normalizarlos a una estructura exacta oficial.

REGLAS REGIONALES OBLIGATORIAS:
1. El Salvador:
   - Identifica el departamento y municipio correcto según la división oficial.
2. Honduras:
   - Reconoce sectores, aldeas y colonias (ejemplo: Cofradía pertenece a San Pedro Sula, Cortés).
   - EXTREMA ATENCIÓN A ERRORES DE SEPARACIÓN: Muchos clientes separan los nombres por error fonético. Ej: "A zacualpa" significa "Azacualpa". Siempre une y corrige estos nombres cotejando con los verdaderos municipios oficiales del departamento.
   - CUIDADO CON LOS HOMÓNIMOS: Existen municipios con el MISMO NOMBRE en diferentes departamentos (Ej: "San Miguelito" en Intibucá y en Francisco Morazán; "San Antonio" en Copán, Cortés, Intibucá; "San Francisco", etc.). Si detectas un municipio homónimo y el cliente NO especificó el departamento, TIENES ESTRICTAMENTE PROHIBIDO ADIVINAR. Debes poner "datos_completos": false y formular una pregunta en "observaciones".
3. Costa Rica:
   - Identifica Provincia, Cantón y señas tradicionales.

DEBES RETORNAR ESTRICTAMENTE UN OBJETO JSON VÁLIDO con la siguiente estructura:
{
  "pais": "El Salvador" | "Honduras" | "Costa Rica",
  "departamento_provincia": "Nombre oficial exacto (DEJAR VACÍO SI HAY HOMÓNIMOS Y NO SE ESPECIFICÓ)",
  "municipio_canton": "Nombre oficial exacto y corregido ortográficamente",
  "direccion_estandarizada": "Barrio/Colonia, calle, pasaje, # casa y puntos de referencia limpios",
  "datos_completos": true | false,
  "observaciones": "Si datos_completos es false, HAZ UNA PREGUNTA DE OPCIONES CERRADAS para que el cliente elija (Ej: 'Hay un San Miguelito en Intibucá y otro en Francisco Morazán, ¿a cuál se refiere?' o '¿Ese barrio queda en San Salvador o en La Libertad?')"
}
`;

export async function normalizarDireccionConGemini(textoDireccion, paisContexto = '') {
    if (!genAI) {
        console.warn("⚠️ GEMINI_API_KEY no detectada. Retornando fallo por defecto en normalizarDireccionConGemini.");
        return {
            datos_completos: false,
            error: 'API_KEY_FALTANTE',
            observaciones: 'Falta configurar GEMINI_API_KEY'
        };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });

        const prompt = `País de contexto: ${paisContexto || 'No especificado (deducir del texto)'}\nTexto de la dirección cruda: "${textoDireccion}"`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error('❌ Error normalizando dirección con Gemini:', error);
        return {
            datos_completos: false,
            error: 'No se pudo estructurar la dirección'
        };
    }
}

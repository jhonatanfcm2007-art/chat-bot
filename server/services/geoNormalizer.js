import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey && apiKey.length > 10) {
    genAI = new GoogleGenerativeAI(apiKey);
}

const SYSTEM_INSTRUCTION = `
Eres un analista logístico experto en geolocalización y toponimia de Centroamérica (Honduras, El Salvador y Costa Rica) para envíos contra entrega (Dropi).
Tu única tarea es recibir datos crudos de una dirección (que pueden venir de textos con mala ortografía o transcripciones fonéticas de notas de voz) y normalizarlos a una estructura exacta.

REGLAS REGIONALES OBLIGATORIAS:
1. El Salvador:
   - Identifica el departamento y municipio correcto según la división oficial (ejemplo: Concepción de Oriente pertenece a La Unión; Santiago de María pertenece a Usulután; El Rosario/La Herradura a La Paz; Suchitoto a Cuscatlán).
2. Honduras:
   - Reconoce sectores, aldeas y colonias (ejemplo: Cofradía pertenece a San Pedro Sula, Cortés; Ceguaca es un municipio de Santa Bárbara).
3. Costa Rica:
   - Identifica Provincia, Cantón y señas tradicionales.

DEBES RETORNAR ESTRICTAMENTE UN OBJETO JSON VÁLIDO con la siguiente estructura:
{
  "pais": "El Salvador" | "Honduras" | "Costa Rica",
  "departamento_provincia": "Nombre oficial",
  "municipio_canton": "Nombre oficial",
  "direccion_estandarizada": "Barrio/Colonia, calle, pasaje, # casa y puntos de referencia limpios",
  "datos_completos": true | false,
  "observaciones": "Si datos_completos es false, HAZ UNA PREGUNTA DE OPCIONES CERRADAS para que el cliente elija (Ej: '¿Ese barrio queda en San Salvador o en La Libertad?' o 'Para enviar por Dropi, ¿podría darnos un punto de referencia cercano como una escuela o parque?')"
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
            model: 'gemini-1.5-flash-latest',
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

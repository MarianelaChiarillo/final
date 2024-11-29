const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

require("dotenv").config({ path: "../.env" }); // Ajustado a cargar desde el directorio padre


const app = express();
const PORT = 3001;

// habilitar CORS para todas las rutas
app.use(cors());

app.get("/recetaStream", (req, res) => {
    const ingredientes = req.query.ingredientes;
    const tipoComida = req.query.tipoComida;
    const cuisine = req.query.cuisine;
    const tiempoCocina = req.query.tiempoCocina;
    const complejidad = req.query.complejidad;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (chunk) => {
        let chunkResponse;
        if (chunk.choices[0].finish_reason === "stop") {
            res.write(`data: ${JSON.stringify({ action: "close"})}\n\n`);
        } else {
            if (
                chunk.choices[0].delta.role &&
                chunk.choices[0].delta.role === "asistente"
            ) {
                chunkResponse = {
                    action: "start",
                };
            } else {
                chunkResponse = {
                    action: "chunk",
                    chunk: chunk.choices[0].delta.content,
                };
            }
            res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`)
        }
    };

    const prompt = [];
    prompt.push("Genera una receta que incorpore los siguientes detalles:");
    prompt.push(`[Ingredientes: ${ingredientes}]`);
    prompt.push(`[Tipo de comida: ${tipoComida}]`);
    prompt.push(`[Cuisine: ${cuisine}]`);
    prompt.push(`[Tiempo de cocina: ${tiempoCocina}]`)
    prompt.push(`[Complejidad: ${complejidad}]`);
    prompt.push(
        "Por favor devuelve una receta detallada, incluyendo pasos para la preparación y cocción. Sólo utiliza los ingredientes introducidos"
    );
    prompt.push(
        "La receta debería resaltar la frescura y los sabores de los ingredientes"
    );
    prompt.push(
        "También dale a la receta un nombre acorde en el idioma local y basado en la cuisine elegida"
    );

    const messages = [
        {
            role: "system",
            content: prompt.join(" "),
        },
    ];

    fetchOpenAICompletionsStream(messages, sendEvent);

    req.on("close", () => {
        res.end();
    });

});


async function fetchOpenAICompletionsStream(messages, callback) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Cambia a "gpt-3.5-turbo" si aún falla
            messages: messages,
            temperature: 1,
            stream: true,
        });

        for await (const chunk of completion) {
            callback(chunk);
        }
    } catch (error) {
        console.error("Error al obtener datos de OpenAI API:", error.message);
    }
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
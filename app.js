// --- FUNÇÃO 1: PEGAR URL DA MÍDIA (BLINDADA COM FETCH NATIVO) ---
async function getMediaUrl(mediaId) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const idLimpo = String(mediaId).replace(/[^a-zA-Z0-9]/g, '');
        const urlFinal = `graph.facebook.com{idLimpo}`;
        
        console.log("🔗 Solicitando ID via Fetch: " + idLimpo);

        const response = await fetch(urlFinal, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${tokenLimpo}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const erroData = await response.json();
            console.error("❌ Erro Resposta Meta:", erroData);
            return null;
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error("❌ Erro Crítico no getMediaUrl:", error.message);
        return null;
    }
}

// --- FUNÇÃO 2: BAIXAR E CONVERTER PARA BASE64 ---
async function downloadMediaAsBase64(url) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenLimpo}` }
        });

        if (!response.ok) throw new Error(`Falha no download: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("❌ Erro no download do binário:", error.message);
        return null;
    }
}

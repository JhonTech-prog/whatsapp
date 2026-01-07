export async function POST(request) {
    return new Response(JSON.stringify({ recebido: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

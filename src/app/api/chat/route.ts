export async function POST() {
  return Response.json(
    { ok: false, message: 'TODO: validate session, assemble prompt, and call the model provider.' },
    { status: 501 },
  );
}

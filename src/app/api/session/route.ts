export async function POST() {
  return Response.json(
    { ok: false, message: 'TODO: create or restore a chat session from a validated QR token.' },
    { status: 501 },
  );
}

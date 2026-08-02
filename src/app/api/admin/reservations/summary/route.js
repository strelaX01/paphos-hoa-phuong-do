import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;

  try {
    const [pending, latest] = await prisma.$transaction([
      prisma.reservation.count({ where: { status: "PENDING" } }),
      prisma.reservation.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    return Response.json({
      data: { pending, latestCreatedAt: latest?.createdAt.toISOString() || null },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/reservations/summary", error);
    return Response.json({ error: "Failed to load reservation count." }, { status: 500 });
  }
}

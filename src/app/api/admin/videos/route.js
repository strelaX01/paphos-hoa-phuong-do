import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";
import { readVideoAssetMetadata, validateVideoSpecialInput } from "@/lib/validations/videoSpecial";
import { serializeVideoSpecial, videoSpecialSelect } from "@/lib/videoSpecialData";
import { deleteManagedVideo } from "@/lib/videoStorage";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim().toUpperCase() || "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20));
  const where = {
    ...(query ? {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    } : {}),
    ...(["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? { status } : {}),
  };

  try {
    const [videos, total] = await prisma.$transaction([
      prisma.videoSpecial.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: videoSpecialSelect,
      }),
      prisma.videoSpecial.count({ where }),
    ]);

    return Response.json({
      data: videos.map(serializeVideoSpecial),
      meta: {
        limit,
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/videos", error);
    return Response.json({ error: "Failed to load video specials." }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateVideoSpecialInput(body);
  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  const assetMetadata = readVideoAssetMetadata(body.asset);
  const isFreshUpload = typeof body.asset?.path === "string" && body.asset.path.startsWith("videos/");

  try {
    const video = await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          type: "VIDEO",
          url: validation.data.videoUrl,
          ...assetMetadata,
        },
      });

      return tx.videoSpecial.create({
        data: {
          ...validation.data,
          assetId: asset.id,
        },
        select: videoSpecialSelect,
      });
    });

    return Response.json({ data: serializeVideoSpecial(video) }, { status: 201 });
  } catch (error) {
    if (isFreshUpload) {
      try {
        await deleteManagedVideo(validation.data.videoUrl);
      } catch (cleanupError) {
        console.error("Failed to clean up video after create error", cleanupError);
      }
    }
    console.error("POST /api/admin/videos", error);
    return Response.json({ error: "Failed to create video special." }, { status: 500 });
  }
}

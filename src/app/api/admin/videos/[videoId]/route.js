import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";
import { readVideoAssetMetadata, validateVideoSpecialInput } from "@/lib/validations/videoSpecial";
import { serializeVideoSpecial, videoSpecialSelect } from "@/lib/videoSpecialData";
import { deleteManagedVideo } from "@/lib/videoStorage";

export const dynamic = "force-dynamic";

async function getVideoId(context) {
  const params = await context.params;
  return params.videoId;
}

export async function GET(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getVideoId(context);
  try {
    const video = await prisma.videoSpecial.findUnique({
      where: { id },
      select: videoSpecialSelect,
    });

    if (!video) return Response.json({ error: "Video special not found." }, { status: 404 });
    return Response.json({ data: serializeVideoSpecial(video) });
  } catch (error) {
    console.error("GET /api/admin/videos/[videoId]", error);
    return Response.json({ error: "Failed to load video special." }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getVideoId(context);
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateVideoSpecialInput(body, { partial: true });
  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  let existing;
  try {
    existing = await prisma.videoSpecial.findUnique({
      where: { id },
      select: { assetId: true, videoUrl: true },
    });
  } catch (error) {
    console.error("PATCH /api/admin/videos/[videoId] lookup", error);
    return Response.json({ error: "Failed to load video special." }, { status: 500 });
  }
  if (!existing) return Response.json({ error: "Video special not found." }, { status: 404 });

  const nextVideoUrl = validation.data.videoUrl;
  const videoChanged = Boolean(nextVideoUrl && nextVideoUrl !== existing.videoUrl);
  const assetMetadata = readVideoAssetMetadata(body.asset);

  try {
    const video = await prisma.$transaction(async (tx) => {
      let assetId = existing.assetId;

      if (videoChanged) {
        if (assetId) {
          await tx.mediaAsset.update({
            where: { id: assetId },
            data: { url: nextVideoUrl, ...assetMetadata },
          });
        } else {
          const asset = await tx.mediaAsset.create({
            data: { type: "VIDEO", url: nextVideoUrl, ...assetMetadata },
          });
          assetId = asset.id;
        }
      }

      return tx.videoSpecial.update({
        where: { id },
        data: {
          ...validation.data,
          ...(assetId !== existing.assetId ? { assetId } : {}),
        },
        select: videoSpecialSelect,
      });
    });

    if (videoChanged) {
      const remainingReferences = await prisma.mediaAsset.count({ where: { url: existing.videoUrl } });
      if (remainingReferences === 0) {
        try {
          await deleteManagedVideo(existing.videoUrl);
        } catch (cleanupError) {
          console.error("Failed to delete replaced video object", cleanupError);
        }
      }
    }

    return Response.json({ data: serializeVideoSpecial(video) });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Video special not found." }, { status: 404 });
    }
    console.error("PATCH /api/admin/videos/[videoId]", error);
    return Response.json({ error: "Failed to update video special." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getVideoId(context);
  let existing;
  try {
    existing = await prisma.videoSpecial.findUnique({
      where: { id },
      select: { assetId: true, videoUrl: true },
    });
  } catch (error) {
    console.error("DELETE /api/admin/videos/[videoId] lookup", error);
    return Response.json({ error: "Failed to load video special." }, { status: 500 });
  }
  if (!existing) return Response.json({ error: "Video special not found." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.videoSpecial.delete({ where: { id } });
      if (existing.assetId) await tx.mediaAsset.delete({ where: { id: existing.assetId } });
    });

    const remainingReferences = await prisma.mediaAsset.count({ where: { url: existing.videoUrl } });
    if (remainingReferences === 0) {
      try {
        await deleteManagedVideo(existing.videoUrl);
      } catch (cleanupError) {
        console.error("Failed to delete removed video object", cleanupError);
      }
    }

    return Response.json({ data: { id } });
  } catch (error) {
    console.error("DELETE /api/admin/videos/[videoId]", error);
    return Response.json({ error: "Failed to delete video special." }, { status: 500 });
  }
}

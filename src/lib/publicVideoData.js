import { prisma } from "@/lib/prisma"

export async function getLatestPublishedVideos(limit = 3) {
  const take = Math.min(3, Math.max(1, Number(limit) || 3))

  try {
    return await prisma.videoSpecial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
      },
    })
  } catch (error) {
    console.error("Failed to load published videos", error)
    return []
  }
}

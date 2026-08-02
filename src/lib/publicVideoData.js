import { prisma } from "@/lib/prisma"

export async function getLatestPublishedVideos(limit = 3) {
  const take = Math.min(3, Math.max(1, Number(limit) || 3))

  try {
    const videos = await prisma.videoSpecial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        createdAt: true,
      },
    })

    const newestPublishedAt = videos[0]?.createdAt?.getTime()
    const isNewestRecent = Number.isFinite(newestPublishedAt)
      && Date.now() - newestPublishedAt <= 14 * 24 * 60 * 60 * 1000

    return videos.map((video, index) => ({
      ...video,
      isRecentlyPublished: index === 0 && isNewestRecent,
    }))
  } catch (error) {
    console.error("Failed to load published videos", error)
    return []
  }
}

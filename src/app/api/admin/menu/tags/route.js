import { prisma } from "@/lib/prisma";
import { validateMenuTagInput } from "@/lib/validations/menuTag";

export const dynamic = "force-dynamic";

function tagSelect() {
  return {
    id: true,
    label: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
  };
}

function serializeTag(tag) {
  return {
    id: tag.id,
    label: tag.label,
    description: tag.description,
    count: tag._count.items,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export async function GET() {
  const tags = await prisma.menuTag.findMany({
    orderBy: [{ label: "asc" }],
    select: tagSelect(),
  });

  return Response.json({ data: tags.map(serializeTag) });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateMenuTagInput(body);

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const tag = await prisma.menuTag.create({
      data: validation.data,
      select: tagSelect(),
    });

    return Response.json({ data: serializeTag(tag) }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json(
        { errors: { label: "A tag with this label already exists." } },
        { status: 409 }
      );
    }

    console.error("POST /api/admin/menu/tags", error);
    return Response.json({ error: "Failed to create tag." }, { status: 500 });
  }
}

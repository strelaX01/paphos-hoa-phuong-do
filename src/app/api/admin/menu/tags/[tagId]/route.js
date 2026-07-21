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

async function getTagId(context) {
  const params = await context.params;
  return params.tagId;
}

export async function GET(_request, context) {
  const id = await getTagId(context);
  const tag = await prisma.menuTag.findUnique({
    where: { id },
    select: tagSelect(),
  });

  if (!tag) {
    return Response.json({ error: "Tag not found." }, { status: 404 });
  }

  return Response.json({ data: serializeTag(tag) });
}

export async function PATCH(request, context) {
  const id = await getTagId(context);
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateMenuTagInput(body, { partial: true });

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const tag = await prisma.menuTag.update({
      where: { id },
      data: validation.data,
      select: tagSelect(),
    });

    return Response.json({ data: serializeTag(tag) });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Tag not found." }, { status: 404 });
    }

    if (error.code === "P2002") {
      return Response.json(
        { errors: { label: "A tag with this label already exists." } },
        { status: 409 }
      );
    }

    console.error("PATCH /api/admin/menu/tags/[tagId]", error);
    return Response.json({ error: "Failed to update tag." }, { status: 500 });
  }
}

export async function DELETE(_request, context) {
  const id = await getTagId(context);

  try {
    await prisma.menuTag.delete({ where: { id } });
    return Response.json({ data: { id } });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Tag not found." }, { status: 404 });
    }

    console.error("DELETE /api/admin/menu/tags/[tagId]", error);
    return Response.json({ error: "Failed to delete tag." }, { status: 500 });
  }
}

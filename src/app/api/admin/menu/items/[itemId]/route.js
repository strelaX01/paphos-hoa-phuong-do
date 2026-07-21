import { prisma } from "@/lib/prisma";
import { deleteManagedMenuImage } from "@/lib/menuImageStorage";
import { validateMenuItemInput } from "@/lib/validations/menuItem";

export const dynamic = "force-dynamic";

function itemSelect() {
  return {
    id: true,
    slug: true,
    name: true,
    nameEn: true,
    description: true,
    price: true,
    image: true,
    deliverable: true,
    isFeatured: true,
    isActive: true,
    sortOrder: true,
    categoryId: true,
    category: {
      select: {
        id: true,
        title: true,
        slug: true,
      },
    },
    tagId: true,
    tag: {
      select: {
        id: true,
        label: true,
      },
    },
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        orderItems: true,
      },
    },
  };
}

function serializeItem(item) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.nameEn,
    description: item.description,
    price: Number(item.price),
    image: item.image,
    deliverable: item.deliverable,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    categoryId: item.categoryId,
    categoryTitle: item.category?.title || null,
    categorySlug: item.category?.slug || null,
    tagId: item.tagId,
    tagLabel: item.tag?.label || null,
    orderCount: item._count.orderItems,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function getItemId(context) {
  const params = await context.params;
  return params.itemId;
}

export async function GET(_request, context) {
  const id = await getItemId(context);
  const item = await prisma.menuItem.findUnique({
    where: { id },
    select: itemSelect(),
  });

  if (!item) {
    return Response.json({ error: "Menu item not found." }, { status: 404 });
  }

  return Response.json({ data: serializeItem(item) });
}

export async function PATCH(request, context) {
  const id = await getItemId(context);
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateMenuItemInput(body, { partial: true });

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const previousItem = await prisma.menuItem.findUnique({
      where: { id },
      select: { image: true },
    });

    if (!previousItem) {
      return Response.json({ error: "Menu item not found." }, { status: 404 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: validation.data,
      select: itemSelect(),
    });

    if (previousItem.image && previousItem.image !== item.image) {
      const remainingReferences = await prisma.menuItem.count({
        where: { image: previousItem.image },
      });

      if (remainingReferences === 0) {
        try {
          await deleteManagedMenuImage(previousItem.image);
        } catch (cleanupError) {
          console.error("Failed to delete replaced menu image", cleanupError);
        }
      }
    }

    return Response.json({ data: serializeItem(item) });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Menu item not found." }, { status: 404 });
    }

    if (error.code === "P2002") {
      return Response.json(
        { errors: { name: "A menu item with this name already exists." } },
        { status: 409 }
      );
    }

    if (error.code === "P2003") {
      return Response.json(
        { errors: { categoryId: "The selected category does not exist." } },
        { status: 422 }
      );
    }

    console.error("PATCH /api/admin/menu/items/[itemId]", error);
    return Response.json({ error: "Failed to update menu item." }, { status: 500 });
  }
}

export async function DELETE(_request, context) {
  const id = await getItemId(context);

  try {
    const item = await prisma.menuItem.findUnique({
      where: { id },
      select: {
        id: true,
        image: true,
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!item) {
      return Response.json({ error: "Menu item not found." }, { status: 404 });
    }

    if (item._count.orderItems > 0) {
      return Response.json(
        { error: `This item has ${item._count.orderItems} order(s). Archive it instead of deleting.` },
        { status: 409 }
      );
    }

    await prisma.menuItem.delete({ where: { id } });

    if (item.image) {
      const remainingReferences = await prisma.menuItem.count({
        where: { image: item.image },
      });

      if (remainingReferences === 0) {
        try {
          await deleteManagedMenuImage(item.image);
        } catch (cleanupError) {
          console.error("Failed to delete removed menu image", cleanupError);
        }
      }
    }

    return Response.json({ data: { id } });
  } catch (error) {
    console.error("DELETE /api/admin/menu/items/[itemId]", error);
    return Response.json({ error: "Failed to delete menu item." }, { status: 500 });
  }
}

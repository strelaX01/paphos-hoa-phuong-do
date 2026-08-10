import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { readAdminJson } from "@/lib/adminJsonRequest";
import { prisma } from "@/lib/prisma";
import { validateMenuCategoryInput } from "@/lib/validations/menuCategory";

export const dynamic = "force-dynamic";

function categorySelect() {
  return {
    id: true,
    slug: true,
    title: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
    items: {
      select: {
        deliverable: true,
      },
    },
  };
}

function serializeCategory(category) {
  const deliverableCount = category.items.filter((item) => item.deliverable).length;

  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    isActive: category.isActive,
    count: category._count.items,
    deliverableCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function getCategoryId(context) {
  const params = await context.params;
  return params.categoryId;
}

export async function GET(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getCategoryId(context);
  const category = await prisma.menuCategory.findUnique({
    where: { id },
    select: categorySelect(),
  });

  if (!category) {
    return Response.json({ error: "Category not found." }, { status: 404 });
  }

  return Response.json({ data: serializeCategory(category) });
}

export async function PATCH(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getCategoryId(context);
  const parsed = await readAdminJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const validation = validateMenuCategoryInput(body, { partial: true });

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const category = await prisma.menuCategory.update({
      where: { id },
      data: validation.data,
      select: categorySelect(),
    });

    return Response.json({ data: serializeCategory(category) });
  } catch (error) {
    if (error.code === "P2025") {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    if (error.code === "P2002") {
      return Response.json(
        { errors: { title: "A category with this name already exists." } },
        { status: 409 }
      );
    }

    console.error("PATCH /api/admin/menu/categories/[categoryId]", error);
    return Response.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getCategoryId(context);

  try {
    const category = await prisma.menuCategory.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!category) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }

    if (category._count.items > 0) {
      return Response.json(
        { error: "Move or delete items in this category before deleting it." },
        { status: 409 }
      );
    }

    await prisma.menuCategory.delete({ where: { id } });

    return Response.json({ data: { id } });
  } catch (error) {
    console.error("DELETE /api/admin/menu/categories/[categoryId]", error);
    return Response.json({ error: "Failed to delete category." }, { status: 500 });
  }
}

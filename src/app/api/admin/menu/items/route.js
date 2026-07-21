import { prisma } from "@/lib/prisma";
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  const where = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: itemSelect(),
  });

  return Response.json({
    data: items.map(serializeItem),
  });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateMenuItemInput(body);

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const item = await prisma.menuItem.create({
      data: {
        name: validation.data.name,
        slug: validation.data.slug,
        nameEn: validation.data.nameEn ?? null,
        description: validation.data.description ?? null,
        price: validation.data.price,
        image: validation.data.image ?? null,
        deliverable: validation.data.deliverable ?? true,
        isFeatured: validation.data.isFeatured ?? false,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
        categoryId: validation.data.categoryId,
        tagId: validation.data.tagId ?? null,
      },
      select: itemSelect(),
    });

    return Response.json({ data: serializeItem(item) }, { status: 201 });
  } catch (error) {
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

    console.error("POST /api/admin/menu/items", error);
    return Response.json({ error: "Failed to create menu item." }, { status: 500 });
  }
}

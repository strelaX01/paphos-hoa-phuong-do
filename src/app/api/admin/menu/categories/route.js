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

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const categories = await prisma.menuCategory.findMany({
    orderBy: [{ title: "asc" }],
    select: categorySelect(),
  });

  return Response.json({
    data: categories.map(serializeCategory),
  });
}

export async function POST(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const parsed = await readAdminJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const validation = validateMenuCategoryInput(body);

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  try {
    const category = await prisma.menuCategory.create({
      data: {
        title: validation.data.title,
        slug: validation.data.slug,
        isActive: validation.data.isActive ?? true,
      },
      select: categorySelect(),
    });

    return Response.json({ data: serializeCategory(category) }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json(
        { errors: { title: "A category with this name already exists." } },
        { status: 409 }
      );
    }

    console.error("POST /api/admin/menu/categories", error);
    return Response.json({ error: "Failed to create category." }, { status: 500 });
  }
}

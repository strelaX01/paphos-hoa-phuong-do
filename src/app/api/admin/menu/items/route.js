import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { deleteManagedMenuImage, MenuImageStorageError, uploadManagedMenuImage } from "@/lib/menuImageStorage";
import { readMenuItemRequest } from "@/lib/menuItemRequest";
import { prisma } from "@/lib/prisma";
import { validateMenuItemInput } from "@/lib/validations/menuItem";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function readPositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

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
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        orderItems: true,
      },
    },
    variants: {
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { id: true, label: true, price: true, sortOrder: true, isActive: true },
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
    orderCount: item._count.orderItems,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    pricingMode: item.variants.length ? "variants" : "single",
    variants: item.variants.map((variant) => ({ ...variant, price: Number(variant.price) })),
  };
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const requestedPage = readPositiveInteger(searchParams.get("page"), 1);
  const pageSize = readPositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const where = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { nameEn: { contains: query, mode: "insensitive" } },
      { category: { title: { contains: query, mode: "insensitive" } } },
    ];
  }

  const [total, available, filteredTotal] = await prisma.$transaction([
    prisma.menuItem.count(),
    prisma.menuItem.count({ where: { isActive: true } }),
    prisma.menuItem.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: itemSelect(),
  });

  return Response.json({
    data: items.map(serializeItem),
    pagination: { page, pageSize, total: filteredTotal, totalPages },
    summary: { total, available },
  });
}

export async function POST(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const parsed = await readMenuItemRequest(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const validation = validateMenuItemInput(parsed.data);

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  let uploadedImage = null;
  try {
    if (parsed.imageFile) uploadedImage = await uploadManagedMenuImage(parsed.imageFile);
    const item = await prisma.menuItem.create({
      data: {
        name: validation.data.name,
        slug: validation.data.slug,
        nameEn: validation.data.nameEn ?? null,
        description: validation.data.description ?? null,
        price: validation.data.price,
        image: uploadedImage ?? validation.data.image ?? null,
        deliverable: validation.data.deliverable ?? true,
        isFeatured: validation.data.isFeatured ?? false,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
        categoryId: validation.data.categoryId,
        ...(validation.data.variants.length
          ? { variants: { create: validation.data.variants } }
          : {}),
      },
      select: itemSelect(),
    });

    return Response.json({ data: serializeItem(item) }, { status: 201 });
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteManagedMenuImage(uploadedImage);
      } catch (cleanupError) {
        console.error("Failed to clean up uncommitted menu image", cleanupError);
      }
    }

    if (error instanceof MenuImageStorageError) {
      return Response.json({ error: error.message }, { status: error.status });
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

    console.error("POST /api/admin/menu/items", error);
    return Response.json({ error: "Failed to create menu item." }, { status: 500 });
  }
}

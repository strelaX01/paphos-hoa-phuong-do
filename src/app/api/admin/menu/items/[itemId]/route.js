import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { deleteManagedMenuImage, MenuImageStorageError, uploadManagedMenuImage } from "@/lib/menuImageStorage";
import { readMenuItemRequest } from "@/lib/menuItemRequest";
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

async function getItemId(context) {
  const params = await context.params;
  return params.itemId;
}

export async function GET(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
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
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const id = await getItemId(context);
  const parsed = await readMenuItemRequest(request);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  const validation = validateMenuItemInput(parsed.data, { partial: true });

  if (!validation.isValid) {
    return Response.json({ errors: validation.errors }, { status: 422 });
  }

  let uploadedImage = null;
  try {
    const previousItem = await prisma.menuItem.findUnique({
      where: { id },
      select: {
        image: true,
        variants: { select: { id: true, label: true } },
      },
    });

    if (!previousItem) {
      return Response.json({ error: "Menu item not found." }, { status: 404 });
    }

    if (parsed.imageFile) uploadedImage = await uploadManagedMenuImage(parsed.imageFile);

    const { pricingMode, variants, ...itemData } = validation.data;
    const existingVariantByLabel = new Map(previousItem.variants.map((variant) => [variant.label, variant]));
    const retainedVariantIds = pricingMode === "variants"
      ? variants.flatMap((variant) => existingVariantByLabel.get(variant.label)?.id || [])
      : [];
    const variantUpdates = pricingMode === "variants"
      ? variants.flatMap((variant) => {
          const existing = existingVariantByLabel.get(variant.label);
          return existing ? [{ where: { id: existing.id }, data: variant }] : [];
        })
      : [];
    const variantCreates = pricingMode === "variants"
      ? variants.filter((variant) => !existingVariantByLabel.has(variant.label))
      : [];
    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...itemData,
        ...(uploadedImage ? { image: uploadedImage } : {}),
        ...(pricingMode ? {
          variants: {
            deleteMany: retainedVariantIds.length ? { id: { notIn: retainedVariantIds } } : {},
            ...(variantUpdates.length ? { update: variantUpdates } : {}),
            ...(variantCreates.length ? { create: variantCreates } : {}),
          },
        } : {}),
      },
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

export async function DELETE(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
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

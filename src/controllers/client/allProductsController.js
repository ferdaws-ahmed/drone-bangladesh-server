const { getDB } = require('../../config/db');

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeList(item));
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizePrice = (product) => {
  const raw =
    product?.pricing?.offerPrice ??
    product?.pricing?.regularPrice ??
    product?.offerPrice ??
    product?.regularPrice ??
    product?.price ??
    0;

  const finalValue = Number(raw);
  return Number.isFinite(finalValue) ? finalValue : 0;
};

const normalizeProduct = (product, productType) => ({
  ...product,
  productType,
  productPath: productType === 'handhelds' ? 'handhelds' : 'drones',
  categoryLabel: product?.subCategory || product?.category || 'General',
  price: normalizePrice(product),
  stockStatus: product?.stockStatus || 'In Stock',
  brand: product?.brand || 'N/A',
  pricing: {
    ...product?.pricing,
    offerPrice: normalizePrice(product),
    regularPrice: Number(product?.pricing?.regularPrice ?? product?.regularPrice ?? product?.price ?? 0),
  },
});

const getSortValue = (value) => {
  switch (value) {
    case 'price-low':
      return 'price-low';
    case 'price-high':
      return 'price-high';
    case 'newest':
      return 'newest';
    case 'popularity':
    default:
      return 'popularity';
  }
};

const getAllProducts = async (req, res) => {
  try {
    const db = await getDB();
    const collectionMap = [
      { name: 'Drones', type: 'drones' },
      { name: 'handhelds', type: 'handhelds' },
    ];

    const allCollections = await Promise.all(
      collectionMap.map(async ({ name, type }) => {
        const items = await db.collection(name).find({}).toArray();
        return items.map((product) => normalizeProduct(product, type));
      })
    );

    let products = allCollections.flat();

    const selectedBrands = normalizeList(req.query.brands);
    const selectedCategories = normalizeList(req.query.categories);
    const selectedAvailability = normalizeList(req.query.availability);
    const selectedTypes = normalizeList(req.query.type);

    const minPrice = Number(req.query.minPrice ?? 10000);
    const maxPrice = Number(req.query.maxPrice ?? 700000);
    const sortValue = getSortValue(req.query.sort);
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.max(1, Math.min(24, Number(req.query.limit ?? 12) || 12));

    if (selectedTypes.length) {
      products = products.filter((product) => selectedTypes.includes(product.productType));
    }

    if (selectedBrands.length) {
      products = products.filter((product) => selectedBrands.includes(product.brand));
    }

    if (selectedCategories.length) {
      products = products.filter((product) => {
        const categoryValue = (product.subCategory || product.category || '').toLowerCase();
        return selectedCategories.some((value) => categoryValue.includes(value.toLowerCase()));
      });
    }

    if (selectedAvailability.length) {
      products = products.filter((product) => selectedAvailability.includes(product.stockStatus));
    }

    const lowerBound = Number.isFinite(minPrice) ? minPrice : 10000;
    const upperBound = Number.isFinite(maxPrice) ? maxPrice : 700000;

    products = products.filter((product) => {
      const price = normalizePrice(product);
      return price >= lowerBound && price <= upperBound;
    });

    const byBrand = [...new Set(products.map((product) => product.brand).filter(Boolean))].sort();
    const byCategory = [...new Set(products.map((product) => product.subCategory || product.category || 'General').filter(Boolean))].sort();

    switch (sortValue) {
      case 'price-low':
        products.sort((a, b) => normalizePrice(a) - normalizePrice(b));
        break;
      case 'price-high':
        products.sort((a, b) => normalizePrice(b) - normalizePrice(a));
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'popularity':
      default:
        products.sort((a, b) => (Number(b.discountPercent || 0) + Number(b.pricing?.savingsAmount || 0)) - (Number(a.discountPercent || 0) + Number(a.pricing?.savingsAmount || 0)));
        break;
    }

    const totalProducts = products.length;
    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      data: paginatedProducts,
      meta: {
        page: safePage,
        limit,
        total: totalProducts,
        totalPages,
        minPrice: 10000,
        maxPrice: 700000,
        availableBrands: byBrand,
        availableCategories: byCategory,
        availableStatus: [...new Set(products.map((product) => product.stockStatus).filter(Boolean))],
      },
    });
  } catch (error) {
    console.error('Error fetching all products:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load products right now.',
    });
  }
};

module.exports = { getAllProducts };

const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const { ok, fail, notFound, serverError } = require('../utils/response');

const redxRequest = async (baseUrl, token, path, options = {}) => {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers: {
      'API-ACCESS-TOKEN': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    console.error('REDX API VALIDATION ERROR:', JSON.stringify(data, null, 2));
    const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : `RedX request failed (${response.status})`);
    throw new Error(errorMsg);
  }
  return data;
};

const resolveDeliveryArea = async (baseUrl, token, address) => {
  const targetArea = (address.upazila || address.district || address.address || '').trim().toLowerCase();

  try {
    // সরাসরি সব এরিয়া এনে চেক করা, যাতে ডিস্ট্রিক্ট ফিল্টারিংয়ের ঝামেলা না থাকে
    const data = await redxRequest(baseUrl, token, `/areas`);
    const areas = Array.isArray(data.areas) ? data.areas : [];

    if (areas.length === 0) {
      return { 
        id: Number(process.env.REDX_DEFAULT_DELIVERY_AREA_ID) || 1, 
        name: address.upazila || address.district || 'Dhaka' 
      };
    }

    // ১. প্রথমে আপেজিলা বা এলাকার নামের সাথে হুবহু বা আংশিক মিল খোঁজা
    let matchedArea = areas.find((area) => {
      const name = String(area.name || '').trim().toLowerCase();
      return name.includes(targetArea) || targetArea.includes(name);
    });

    // ২. যদি না মেলে, তবে ডিস্ট্রিক্ট দিয়ে খোঁজার চেষ্টা করা
    if (!matchedArea && address.district) {
      const targetDistrict = address.district.trim().toLowerCase();
      matchedArea = areas.find((area) => {
        const division = String(area.division_name || '').trim().toLowerCase();
        const name = String(area.name || '').trim().toLowerCase();
        return division.includes(targetDistrict) || name.includes(targetDistrict);
      });
    }

    const selected = matchedArea || areas[0];
    return {
      id: Number(selected.id),
      name: String(selected.name),
    };
  } catch (error) {
    console.error('Error resolving RedX delivery area:', error.message);
    return {
      id: Number(process.env.REDX_DEFAULT_DELIVERY_AREA_ID) || 1,
      name: address.upazila || address.district || 'Dhaka',
    };
  }
};

const createRedxParcel = async (order) => {
  const baseUrl = String(process.env.REDX_API_BASE_URL || '').trim();
  const token = String(process.env.REDX_API_TOKEN || '').trim();
  const path = process.env.REDX_CREATE_PARCEL_PATH || '/parcel';
  if (!baseUrl || !token) throw new Error('REDX_API_BASE_URL and REDX_API_TOKEN are required.');

  const address = order.shippingAddress || {};
  const deliveryArea = await resolveDeliveryArea(baseUrl, token, address);

  let cleanPhone = String(order.customerInfo?.phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('88')) cleanPhone = cleanPhone.slice(2);

  const payload = {
    customer_name: String(order.customerInfo?.name || 'Customer'),
    customer_phone: cleanPhone,
    delivery_area: String(deliveryArea.name),
    delivery_area_id: Number(deliveryArea.id),
    customer_address: String(address.address || address.upazila || 'Dhaka'),
    merchant_invoice_id: String(order.orderId || order._id),
    cash_collection_amount: String(order.paymentMethod === 'Cash on Delivery' ? (Number(order.pricing?.total) || 0) : 0),
    parcel_weight: Number(process.env.REDX_DEFAULT_PARCEL_WEIGHT || 500),
    instruction: String(order.notes || ''),
    value: String(Number(order.pricing?.total) || 0),
    is_closed_box: false, // রেডেক্সের নিয়ম অনুযায়ী এটি বুলিয়ান (false/true) হতে হবে
    ...(process.env.REDX_PICKUP_STORE_ID ? { pickup_store_id: Number(process.env.REDX_PICKUP_STORE_ID) } : {}),
    parcel_details_json: (order.items && order.items.length > 0) 
      ? order.items.map((item) => ({
          name: String(item.name || 'Product'),
          category: String(item.category || 'General'),
          value: Number(item.price || 0),
        }))
      : [
          {
            name: 'General Product',
            category: 'General',
            value: Number(order.pricing?.total || 0),
          }
        ],
  };

  console.log('Final RedX Payload:', JSON.stringify(payload, null, 2));

  const data = await redxRequest(baseUrl, token, path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { payload, response: data };
};

const sendToCourier = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return fail(res, 'Invalid order ID.');
    const db = await getDB();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
    if (!order) return notFound(res, 'Order not found.');
    if (order.paymentMethod !== 'Cash on Delivery' && order.paymentStatus !== 'Paid') {
      return fail(res, 'Online payment must be verified before sending to courier.');
    }
    if (order.courier?.providerOrderId) return fail(res, 'This order has already been sent to courier.');

    const { payload, response } = await createRedxParcel(order);
    const providerOrderId = response.tracking_id || response.trackingId || response.id || response.parcel_id || null;
    const courier = {
      provider: 'RedX',
      providerOrderId,
      status: response.status || 'Order confirmed',
      payload,
      response,
      createdAt: new Date(),
    };
    const update = {
      courier,
      deliveryStatus: 'Processing',
      orderStatus: 'Confirmed',
      confirmedAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('orders').updateOne({ _id: order._id }, { $set: update });
    return ok(res, { ...order, _id: order._id, ...update }, 'Order sent to RedX successfully.');
  } catch (error) {
    console.error('Send to Courier Error:', error.message);
    return serverError(res, error);
  }
};

module.exports = { sendToCourier };
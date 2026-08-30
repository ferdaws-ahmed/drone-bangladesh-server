// server/src/utils/cloudinary.js
const { v2: cloudinary } = require('cloudinary');

// আপনার Cloudinary ড্যাশবোর্ড থেকে পাওয়া Credentials দিয়ে পরিবেশ প্রস্তুত করুন
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Base64 বা Image File-কে Cloudinary তে আপলোড করে অটোমেটিক ক্যোয়ারী ও সর্ট ফরম্যাটে কমানো URL ব্যাক করে
 */
const uploadToCloudinary = async (fileString, folderName = 'drones') => {
  if (!fileString) return null;
  
  // যদি অলরেডি HTTP URL হয়, তবে নতুন করে আপলোড না করে সরাসরি রিটার্ন করবে
  if (typeof fileString === 'string' && fileString.startsWith('http')) {
    return fileString;
  }

  try {
    const uploadResponse = await cloudinary.uploader.upload(fileString, {
      folder: folderName,
      fetch_format: 'auto', // কোয়ালিটি না কমিয়ে সেরা আধুনিক ফরম্যাট (WebP/AVIF) দেবে
      quality: 'auto',      // সর্বোচ্চ ইমেজ কোয়ালিটি ধরে রেখে সাইজ ছোট করবে
    });
    return uploadResponse.secure_url; // এটি সরাসরি https URL প্রদান করে
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('Image Upload Failed');
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
import Wishlist from "../models/wishlistModel.js";

export const attachWishlistFlag = async (courses, userId) => {
  try {
    if (!userId) return courses.map(c => ({ ...c._doc, isWishlisted: false }));

    const wishlist = await Wishlist.findOne({ userId });
    const wishlistIds = wishlist ? wishlist.courses.map(id => id.toString()) : [];

    // Add flag
    return courses.map(c => ({
      ...c._doc,
      isWishlisted: wishlistIds.includes(c._id.toString())
    }));
  } catch (error) {
    console.error("Error attaching wishlist flag:", error);
    return courses.map(c => ({ ...c._doc, isWishlisted: false }));
  }
};

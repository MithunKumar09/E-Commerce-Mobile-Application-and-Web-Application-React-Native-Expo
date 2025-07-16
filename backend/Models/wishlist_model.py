# backend/models/wishlist_model.py
from flask_pymongo import PyMongo
from flask import jsonify

def get_all_wishlist_items(mongo, user_id):
    # Fetch all wishlist items from the 'wishlist' collection in MongoDB for a specific user
    try:
        wishlist_items = list(mongo.db.wishlist.find({"userId": user_id}))
        print(f"Wishlist items retrieved from DB for user {user_id}: {wishlist_items}")
        
        # Format the wishlist details to match the JavaScript model structure
        wishlist_list = [
            {
                "userId": str(item["userId"]),  # Convert ObjectId to string
                "productId": str(item["productId"]),  # Convert ObjectId to string
                "wishlistStatus": item.get("wishlistStatus", "removed")
            }
            for item in wishlist_items
        ]
        
        return wishlist_list
    except Exception as e:
        print("Error fetching wishlist items:", e)
        return []
# backend/models/cart_model.py
from flask_pymongo import PyMongo
from flask import jsonify
from bson import ObjectId

def get_cart_products(mongo, user_id):
    try:
        # Find the cart based on the user ID
        cart = mongo.db.carts.find_one({"userId": ObjectId(user_id)})

        if not cart:
            print(f"No cart found for user: {user_id}")
            return []

        # Retrieve the cart items and fetch the corresponding product details
        cart_items = cart.get("items", [])
        product_list = []

        for cart_item in cart_items:
            product_id = cart_item["productId"]
            quantity = cart_item["quantity"]

            # Fetch the product details from the products collection
            product = mongo.db.products.find_one({"_id": ObjectId(product_id)})

            if product:
                product_details = {
                    "name": product["name"],
                    "description": product["description"],
                    "productPrice": f"${product['productPrice']:.2f}",
                    "salePrice": f"${product['salePrice']:.2f}",
                    "category": product["category"],
                    "brand": product["brand"],
                    "isListed": product.get("isListed", True),
                    "quantity": quantity,
                    "color": product["color"],
                    "images": {
                        "imageUrl": product["images"]["imageUrl"],
                        "thumbnailUrl": product["images"].get("thumbnailUrl", [])
                    },
                    "cashOnDelivery": product.get("cashOnDelivery", "Not available"),
                    "codAmount": product.get("codAmount", 0)
                }
                product_list.append(product_details)

        return product_list
    except Exception as e:
        print(f"Error fetching cart products for user {user_id}: {e}")
        return []


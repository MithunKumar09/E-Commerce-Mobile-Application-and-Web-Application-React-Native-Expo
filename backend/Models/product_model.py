# backend/models/product_model.py
from flask_pymongo import PyMongo
from flask import jsonify

def get_all_products(mongo):
    # Fetch all products from the 'products' collection in MongoDB
    try:
        products = list(mongo.db.products.find())
        print(f"Products retrieved from DB: {products}")
        
        # Format the product details to match the product structure in the JavaScript model
        product_list = [
            {
                "name": product["name"],
                "description": product["description"],
                "productPrice": f"${product['productPrice']:.2f}",
                "salePrice": f"${product['salePrice']:.2f}",
                "category": product["category"],
                "brand": product["brand"],
                "isListed": product.get("isListed", True),
                "quantity": product["quantity"],
                "discount": product.get("discount", 0),
                "color": product["color"],
                "images": {
                    "imageUrl": product["images"]["imageUrl"],
                    "thumbnailUrl": product["images"].get("thumbnailUrl", [])
                },
                "cashOnDelivery": product.get("cashOnDelivery", "Not available"),
                "codAmount": product.get("codAmount", 0)
            }
            for product in products
        ]
        
        return product_list
    except Exception as e:
        print("Error fetching products:", e)
        return []


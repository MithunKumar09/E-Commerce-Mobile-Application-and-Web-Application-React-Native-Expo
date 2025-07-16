# backend/models/recommendation_model.py
from Models.product_model import get_all_products
from flask import jsonify

def recommend_products(user_query, mongo):
    try:
        # Fetch all products from MongoDB
        products = get_all_products(mongo)
        
        # Simple recommendation logic: filter products by query (e.g., product name contains the query)
        recommended_products = [
            product for product in products if user_query.lower() in product['name'].lower()
        ]
        
        # Limit to top 5 recommended products (if any)
        return recommended_products[:5]
    except Exception as e:
        print("Error fetching recommended products:", e)
        return []

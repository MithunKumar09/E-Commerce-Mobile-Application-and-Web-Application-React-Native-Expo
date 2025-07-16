# backend/routes/query.py
from flask import Blueprint, request, jsonify
from db import mongo
from Models.recommendation_model import recommend_products
from Models.nlp_model import classify_query

query_blueprint = Blueprint('query', __name__)

@query_blueprint.route('/query', methods=['POST'])
def query():
    user_query = request.json.get('query', '')
    print(f"Received user query: {user_query}")
    intent = classify_query(user_query)
    print(f"Classified intent: {intent}")
    
    if intent == "Recommend Product":
        products = recommend_products(user_query, mongo)
        print(f"Recommended products: {products}")
    else:
        products = []

    return jsonify({'intent': intent, 'products': products})

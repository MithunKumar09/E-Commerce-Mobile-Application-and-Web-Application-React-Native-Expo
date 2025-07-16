# backend/app.py
from flask import Flask, jsonify
from db import mongo  # Import the 'mongo' instance from db.py
from Routes.query import query_blueprint  # Import query blueprint

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb+srv://MithunKumar:SjwA4TskbTqn0Ibt@atlascluster.aubczdk.mongodb.net/ecommerceDB"

# Initialize MongoDB connection
mongo.init_app(app)

# Register blueprints
app.register_blueprint(query_blueprint, url_prefix='/api')

@app.route('/')
def home():
    return "Welcome to the E-commerce App API"

# Example route for MongoDB CRUD operation (Read)
@app.route('/products', methods=['GET'])
def get_products():
    products = mongo.db.products.find()
    print(f"Products retrieved from DB: {products}")
    product_list = [{"name": product["name"], "price": product["price"]} for product in products]
    return jsonify(product_list)

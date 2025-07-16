# backend/models/assign_order_model.py
from flask_pymongo import PyMongo
from flask import jsonify
from bson import ObjectId

def get_assigned_orders(mongo, user_id):
    try:
        # Query for the assigned orders based on the 'salesmanId' or 'assignedBy' (depending on the role)
        # Here we assume you want to retrieve orders assigned to a specific Salesman or Admin
        assigned_orders = list(mongo.db.assignorders.find({
            "$or": [
                {"salesmanId": ObjectId(user_id)},  # For retrieving orders assigned to a specific salesman
                {"assignedBy": ObjectId(user_id)}   # For retrieving orders assigned by a specific admin
            ]
        }))

        if not assigned_orders:
            print(f"No assigned orders found for user: {user_id}")
            return []

        order_list = []
        for order in assigned_orders:
            # Format the order details with necessary fields
            formatted_order = {
                "orderId": order["orderId"],
                "salesmanId": str(order["salesmanId"]),
                "assignedBy": str(order["assignedBy"]),
                "assignedAt": order["assignedAt"],
                "status": order["status"],
                "comments": order.get("comments", ""),
                "trackingId": order.get("trackingId", ""),
                "latitude": order.get("latitude", None),
                "longitude": order.get("longitude", None),
                "area": order.get("area", ""),
                "acceptedTime": order.get("acceptedTime", None),
                "locationUpdateTime": order.get("locationUpdateTime", None),
                "orderStatusHistory": order.get("orderStatusHistory", []),
                "locationHistory": order.get("locationHistory", [])
            }
            order_list.append(formatted_order)

        return order_list

    except Exception as e:
        print(f"Error fetching assigned orders for user {user_id}: {e}")
        return []


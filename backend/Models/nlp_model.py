# backend/models/nlp_model.py

import spacy
from transformers import pipeline

# Load spaCy model for text processing
nlp = spacy.load("en_core_web_sm")

# Initialize a HuggingFace transformer pipeline for classification (optional, you can use a pre-trained model)
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Real intent classification using transformer model
def classify_query(query):
    query = query.lower()
    
    # Using Hugging Face for Zero-Shot classification
    candidate_labels = ["purchase", "recommendation", "order_status", "greeting", "product_inquiry"]
    
    result = classifier(query, candidate_labels)
    intent = result['labels'][0]  # Get the top predicted label
    
    return intent
// backend/utils/intentHandler.js
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const { BayesClassifier } = natural;

const intents = {
  greeting: ["hi", "hello", "hey"],
  orderStatus: ["where is my order", "order status", "track order", "My Cart Items"],
  productInquiry: ["tell me about product", "product details"]
};

const responses = {
  greeting: "Hello! How can I assist you today?",
  orderStatus: "Please provide your order ID to track your order.",
  productInquiry: "Can you specify the product you’re interested in?",
  default: "I'm here to help! Please ask your question."
};

// Train the classifier with sample phrases for each intent
const classifier = new BayesClassifier();
Object.entries(intents).forEach(([intent, phrases]) => {
  phrases.forEach(phrase => classifier.addDocument(phrase, intent));
});
classifier.train();

function intentHandler(intent) {
  const lowerMessage = intent.toLowerCase();
  const tokens = tokenizer.tokenize(lowerMessage);

  // Classify the message and get the confidence score
  const classification = classifier.getClassifications(lowerMessage);
  const highestScoreIntent = classification[0];

  // Check for specific keywords in tokens to help clarify intent
  if (tokens.includes("order") && tokens.includes("status")) {
    return responses.orderStatus;
  } else if (tokens.includes("product") && tokens.includes("details")) {
    return responses.productInquiry;
  } else if (tokens.some(token => intents.greeting.includes(token))) {
    return responses.greeting;
  }

  // Check if the highest scoring intent has a confident score or fallback
  if (highestScoreIntent && highestScoreIntent.value > 0.6 && responses[highestScoreIntent.label]) {
    return responses[highestScoreIntent.label];
  }

  // If no strong intent, return default response
  return responses.default;
}

module.exports = intentHandler;

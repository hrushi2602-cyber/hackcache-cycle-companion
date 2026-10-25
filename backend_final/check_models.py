import os
from dotenv import load_dotenv
from google import genai

# Load your API key
load_dotenv()
client = genai.Client()

print("Available models for your API key:")
for model in client.models.list():
    # Only print models that support text generation
    if "generateContent" in model.supported_actions:
        print(f"- {model.name}")
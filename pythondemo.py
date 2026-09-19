from dotenv import load_dotenv
load_dotenv()

import csv
import json
from anthropic import Anthropic

with open("target_grocery_prices_verified.csv", mode="r") as file:
    reader = csv.DictReader(file)
    data = list(reader)

RECIPE_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "minLength": 1
        },
        "website": {
            "type": "string",
            "minLength": 1
        },
        "ingredients": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "properties": {
                    "item": {
                        "type": "string",
                        "minLength": 1
                    },
                    "amount": {
                        "type": "string",
                        "minLength": 1
                    }
                },
                "required": ["item", "amount"],
                "additionalProperties": False
            }
        },
        "directions": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    },
    "required": [
        "name",
        "website",
        "ingredients",
        "directions"
    ],
    "additionalProperties": False
}

choice = input("What would you like to eat today? ")

client = Anthropic()

message = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=10000,
    messages=[
        {
            "role": "user",
            "content": (
                f"Find a simple online recipe for {choice}. "
                "Return the recipe matching the requested schema."
            )
        }
    ],
    tools=[
        {
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 5
        }
    ],
    output_config={
        "format": {
            "type": "json_schema",
            "schema": RECIPE_SCHEMA
        }
    }
)

result = next(
    block.text
    for block in message.content
    if hasattr(block, "text")
)

result_json = json.loads(result)

print(json.dumps(result_json, indent=2))

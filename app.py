import os
from flask import Flask, render_template, request, jsonify, send_file
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision.transforms import v2
from PIL import Image
import io
import torch.nn.functional as F
import pandas as pd

app = Flask(__name__)

# Global variables
model = None
class_names = None
device = None
transform = None
dataset_path = None
pokedex_images_path = None
pokedex_data = None


def load_model():
    """Load the Pokemon classifier model and class names at startup"""
    global model, class_names, device, transform, dataset_path, pokedex_images_path, pokedex_data

    print("Loading Pokemon classifier model...")

    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # Load class names from text file (much smaller than loading full ImageFolder dataset)
    # Use environment variable for dataset path, fallback to local path for development
    base_path = os.getenv('DATASET_PATH', os.path.join(os.path.dirname(__file__), 'dataset'))

    # Load class names from file instead of ImageFolder
    class_names_path = os.path.join(base_path, 'class_names.txt')
    with open(class_names_path, 'r', encoding='utf-8') as f:
        class_names = [line.strip() for line in f if line.strip()]
    print(f"Loaded {len(class_names)} Pokemon classes from {class_names_path}")

    # Set path for Pokedex images
    pokedex_images_path = os.path.join('static', 'images', 'Pokedex Image Dataset')

    # Load Pokedex data CSV
    pokedex_csv_path = os.path.join('static', 'css', 'updated_pokedex_dataset.csv')
    pokedex_data = pd.read_csv(pokedex_csv_path)
    print(f"Loaded Pokedex data with {len(pokedex_data)} entries")

    # Create transform (same as notebook)
    transform = v2.Compose([
        v2.Resize((256, 256)),
        v2.ToImage(),
        v2.ToDtype(torch.float32, scale=True)
    ])

    # Load model architecture
    model = models.efficientnet_b3(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1069)

    # Load trained weights
    model_path = os.path.join(os.path.dirname(__file__), './model_epochs/model_epoch6.pth')
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    model = model.to(device)

    print(f"Model loaded successfully on {device}")


def preprocess_image(image_bytes):
    """Preprocess image for model inference"""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img_tensor = transform(img).unsqueeze(0)
    return img_tensor.to(device)


def get_pokemon_image(pokemon_name):
    """Get the Pokemon image from the Pokedex Image Dataset"""
    try:
        # Convert name to lowercase with underscores (e.g., "Shiny Abomasnow" -> "shiny_abomasnow")
        file_name = pokemon_name.lower().replace(' ', '_').replace('-', '_') + '.png'
        image_path = os.path.join(pokedex_images_path, file_name)

        if os.path.exists(image_path):
            return file_name
        return None
    except Exception as e:
        print(f"Error getting image for {pokemon_name}: {str(e)}")
        return None


def get_pokemon_info(pokemon_name):
    """Get Pokemon information from the Pokedex CSV"""
    try:
        # Clean the pokemon name to match CSV format (remove "Shiny" prefix, handle special cases)
        clean_name = pokemon_name.replace('Shiny ', '').strip()

        # Try to find the Pokemon in the dataset (case-insensitive)
        pokemon_row = pokedex_data[pokedex_data['Name'].str.lower() == clean_name.lower()]

        if pokemon_row.empty:
            return None

        pokemon = pokemon_row.iloc[0]

        # Type emoji mapping
        type_emojis = {
            'normal': '⚪', 'fire': '🔥', 'water': '💧', 'electric': '⚡',
            'grass': '🌿', 'ice': '❄️', 'fighting': '🥊', 'poison': '☠️',
            'ground': '🌍', 'flying': '🦅', 'psychic': '🔮', 'bug': '🐛',
            'rock': '🪨', 'ghost': '👻', 'dragon': '🐉', 'dark': '🌑',
            'steel': '⚙️', 'fairy': '🧚'
        }

        # Build description
        # Type information
        type_str = pokemon['Type1'].lower()
        type_emoji_str = type_emojis.get(type_str, '❓')

        if pd.notna(pokemon['Type2']):
            type2 = pokemon['Type2'].lower()
            type_str += f"/{type2}"
            type_emoji_str += type_emojis.get(type2, '❓')

        # Legendary status
        is_legendary = pd.notna(pokemon['Legendary']) and pokemon['Legendary']
        legendary_str = " legendary" if is_legendary else ""

        # Generation
        generation_str = ""
        if pd.notna(pokemon['Generation']):
            generation_names = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th", 9: "9th"}
            gen_str = generation_names.get(int(pokemon['Generation']), f"{int(pokemon['Generation'])}th")
            generation_str = f" from the {gen_str} generation"

        # Build main description (without emojis in the text)
        description = f"{pokemon['Name']} is a {type_str} type{legendary_str} pokemon{generation_str}."

        # Evolution
        if pd.notna(pokemon['Evolution']):
            evolution = pokemon['Evolution']
            description += f" It is the evolved version of {evolution}."

        # Stats
        stats = {
            'HP': int(pokemon['HP']) if pd.notna(pokemon['HP']) else 0,
            'Attack': int(pokemon['Attack']) if pd.notna(pokemon['Attack']) else 0,
            'Defense': int(pokemon['Defense']) if pd.notna(pokemon['Defense']) else 0,
            'Sp. Atk': int(pokemon['SpAtk']) if pd.notna(pokemon['SpAtk']) else 0,
            'Sp. Def': int(pokemon['SpDef']) if pd.notna(pokemon['SpDef']) else 0,
            'Speed': int(pokemon['Speed']) if pd.notna(pokemon['Speed']) else 0
        }

        result = {
            'description': description,
            'type_emojis': type_emoji_str,
            'stats': stats,
            'number': int(pokemon['Num']) if pd.notna(pokemon['Num']) else None
        }

        print(f"Generated Pokemon info for {pokemon_name}:")
        print(f"  Type emojis: {type_emoji_str}")
        print(f"  Description: {description[:50]}...")

        return result

    except Exception as e:
        print(f"Error getting Pokemon info for {pokemon_name}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


@app.route('/')
def index():
    """Serve the main web interface"""
    return render_template('index.html')


@app.route('/pokemon_image/<path:image_path>')
def serve_pokemon_image(image_path):
    """Serve Pokemon images from the Pokedex Image Dataset"""
    try:
        full_path = os.path.join(pokedex_images_path, image_path)
        if os.path.exists(full_path):
            return send_file(full_path, mimetype='image/png')
        else:
            return jsonify({'error': 'Image not found'}), 404
    except Exception as e:
        print(f"Error serving image: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/predict', methods=['POST'])
def predict():
    """Handle image upload and return predictions"""
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image uploaded'})

        file = request.files['image']

        # Check if file is empty
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})

        # Read and preprocess image
        img_bytes = file.read()
        img_tensor = preprocess_image(img_bytes)

        # Run inference
        with torch.no_grad():
            output = model(img_tensor)
            probs = F.softmax(output, dim=1)
            top5_probs, top5_indices = torch.topk(probs, 5)

        # Format predictions
        predictions = []
        for prob, idx in zip(top5_probs[0], top5_indices[0]):
            pokemon_name = class_names[idx.item()]
            # Format name: capitalize and replace hyphens with spaces
            formatted_name = pokemon_name.replace('-', ' ').title()

            # Get image path for this Pokemon
            image_path = get_pokemon_image(pokemon_name)

            predictions.append({
                'name': formatted_name,
                'probability': round(prob.item() * 100, 2),
                'image_url': f'/pokemon_image/{image_path}' if image_path else None
            })

        # Get top prediction
        top_prediction = predictions[0]['name']

        # Get Pokedex info for top prediction
        pokemon_info = get_pokemon_info(top_prediction)

        return jsonify({
            'success': True,
            'predictions': predictions,
            'top_prediction': top_prediction,
            'pokemon_info': pokemon_info
        })

    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error processing image: {str(e)}'
        })


if __name__ == '__main__':
    # Load model before starting server
    load_model()

    # Run Flask app
    # Use PORT environment variable for deployment, default to 5000 for local
    port = int(os.getenv('PORT', 5000))
    # In production, listen on all interfaces (0.0.0.0)
    host = '0.0.0.0' if os.getenv('PORT') else '127.0.0.1'
    debug = not bool(os.getenv('PORT'))  # Debug only in local development

    app.run(debug=debug, host=host, port=port)

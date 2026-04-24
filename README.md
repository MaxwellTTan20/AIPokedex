# AI Pokedex - Pokemon Classifier

A web application that uses deep learning (EfficientNet-B3) to classify Pokemon from uploaded images. Built with Flask and PyTorch.

## Features

- 🎯 Classifies 1069 different Pokemon (including variants)
- 📊 Shows top 5 predictions with confidence scores
- 📖 Displays Pokedex information (type, stats, evolution)
- 🎨 Drawing canvas to sketch Pokemon
- 📱 Mobile-responsive design

## Tech Stack

- **Backend**: Flask, PyTorch, EfficientNet-B3
- **Frontend**: HTML, CSS, JavaScript
- **ML**: PyTorch with pretrained EfficientNet-B3

## Local Development

### Prerequisites
- Python 3.11+
- Dataset (Pokemon images and CSV)
- Trained model file (`model_epoch6.pth`)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd AIPokedex
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Set up dataset
   - Place dataset in `dataset/` folder:
     - `dataset/Pokemon Labelled Classification Images/`
     - `dataset/Pokedex Image Dataset/`
     - `dataset/updated_pokedex_dataset.csv`

4. Run the app
```bash
python app.py
```

5. Open http://localhost:5000

## Deployment to Render

### Before Deployment

**⚠️ IMPORTANT: Dataset Size Issue**

The full dataset (~140k images) is too large for free Render hosting. You have 3 options:

**Option A: Use Render Paid Plan**
- Upgrade to a paid plan with more storage
- Upload full dataset to persistent disk

**Option B: Reduce Dataset Size**
- Only include the "Pokedex Image Dataset" (1069 images)
- Remove the large "Pokemon Labelled Classification Images" folder
- Update code to load class_names from a text file instead of ImageFolder

**Option C: Use External Storage**
- Host images on AWS S3, Cloudflare R2, or similar
- Fetch images from URLs instead of local files

### Deployment Steps (Option B - Recommended for Free Tier)

1. **Prepare Repository**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Upload Files to Render**
   - Create a new Web Service on Render
   - Connect your GitHub repository
   - Render will use `render.yaml` automatically

3. **Upload Dataset** (if using Option A)
   - Use Render's persistent disk feature
   - Upload via SSH or Render CLI

4. **Set Environment Variables** (Optional)
   - `DATASET_PATH`: Path to dataset folder
   - `PORT`: Auto-set by Render

5. **Deploy**
   - Render will build and deploy automatically
   - First deployment may take 10-15 minutes (downloading PyTorch)

### Model File

**Note**: Your model file (`model_epoch6.pth`) may be too large for GitHub (>100MB).

Solutions:
- Use Git LFS (Large File Storage)
- Host model on cloud storage and download on startup
- Use Render's persistent disk

## Project Structure

```
AIPokedex/
├── app.py                  # Flask application
├── requirements.txt        # Python dependencies
├── render.yaml            # Render deployment config
├── model_epochs/          # Trained models
│   └── model_epoch6.pth
├── static/
│   ├── css/
│   ├── js/
│   └── images/
├── templates/
│   └── index.html
└── dataset/               # Dataset (not in repo)
    ├── Pokemon Labelled Classification Images/
    ├── Pokedex Image Dataset/
    └── updated_pokedex_dataset.csv
```

## Model Information

- **Architecture**: EfficientNet-B3
- **Classes**: 1069 Pokemon
- **Input Size**: 256x256
- **Framework**: PyTorch

## Credits

- Dataset: Kaggle Pokemon Dataset
- Model: EfficientNet-B3 (pretrained)
- Built with PyTorch & Flask

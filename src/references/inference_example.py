"""
Example inference script showing CORRECT preprocessing for Emotion Model.
Share this with your friend to ensure Laravel implementation matches.
"""

import torch
import cv2
import numpy as np
from torchvision import transforms
from models import EmotionNet

def preprocess_face_for_emotion(face_image):
    """
    Correct preprocessing pipeline for Emotion Model.
    
    Args:
        face_image: numpy array (BGR from OpenCV or RGB)
    
    Returns:
        tensor: preprocessed tensor ready for model
    """
    # 1. Convert to grayscale
    if len(face_image.shape) == 3:
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = face_image
    
    # 2. Resize to 48x48 (IMPORTANT: use correct interpolation)
    resized = cv2.resize(gray, (48, 48), interpolation=cv2.INTER_AREA)
    
    # 3. Convert to tensor and normalize
    transform = transforms.Compose([
        transforms.ToTensor(),  # Converts to [0, 1] and adds channel dimension
        transforms.Normalize(mean=[0.5], std=[0.5])  # CRITICAL: Same as training
    ])
    
    tensor = transform(resized)
    
    # 4. Add batch dimension
    tensor = tensor.unsqueeze(0)  # Shape: [1, 1, 48, 48]
    
    return tensor


def predict_emotion(model, face_image, device='cpu'):
    """
    Predict emotion from face image.
    
    Args:
        model: EmotionNet model
        face_image: numpy array of face region
        device: 'cpu' or 'cuda'
    
    Returns:
        dict with 'label' and 'confidence'
    """
    # Emotion classes (MUST match training order)
    EMOTION_CLASSES = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
    
    # Preprocess
    input_tensor = preprocess_face_for_emotion(face_image).to(device)
    
    # Inference
    model.eval()  # CRITICAL: Set to eval mode
    with torch.no_grad():  # CRITICAL: Disable gradients
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)
    
    return {
        'label': EMOTION_CLASSES[predicted.item()],
        'confidence': confidence.item(),
        'all_probabilities': {
            EMOTION_CLASSES[i]: probabilities[0][i].item() 
            for i in range(len(EMOTION_CLASSES))
        }
    }


# CLI usage for Laravel integration
if __name__ == "__main__":
    import argparse
    import json
    import sys
    import os

    # Argument parser
    parser = argparse.ArgumentParser(description='Emotion Recognition Inference')
    parser.add_argument('image_path', type=str, help='Path to the face image file')
    parser.add_argument('--model_path', type=str, default='checkpoints/emotion_best.pth', help='Path to .pth model file')
    args = parser.parse_args()

    try:
        # Check if file exists
        if not os.path.exists(args.image_path):
            print(json.dumps({"error": f"Image file not found: {args.image_path}"}))
            sys.exit(1)

        # Load model
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = EmotionNet(num_classes=7).to(device)
        
        if not os.path.exists(args.model_path):
             print(json.dumps({"error": f"Model file not found: {args.model_path}"}))
             sys.exit(1)

        model.load_state_dict(torch.load(args.model_path, map_location=device))
        model.eval()
        
        # Load image
        image = cv2.imread(args.image_path)
        if image is None:
            print(json.dumps({"error": "Failed to load image with OpenCV"}))
            sys.exit(1)
        
        # Predict
        result = predict_emotion(model, image, device)
        
        # Output JSON for Laravel
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

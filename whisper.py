import requests
import json
import os
from io import BytesIO
from tempfile import NamedTemporaryFile

# Environment variables should be used to securely store the API keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

def get_audio(audio_file):
    with NamedTemporaryFile(suffix=".webm", delete=False) as temp:
        temp.write(audio_file.read())  # ファイルの内容を一時ファイルに書き込む
        temp_filename = temp.name  # ファイル名を保存

    # 一時ファイルを閉じてから音声認識を行う
    return speech_to_text(temp_filename)

def speech_to_text(file_path):
    with open(file_path, 'rb') as f:
        payload = {
            'model': 'whisper-1',
            'temperature': 0
        }

        headers = {
            'Authorization': f'Bearer {OPENAI_API_KEY}'
        }

        files = {
            'file': (os.path.basename(file_path), f)
        }

        response = requests.post(
            "https://api.openai.com/v1/audio/transcriptions", 
            headers=headers, 
            data=payload, 
            files=files,
            timeout=30
        )

        if response.status_code == 200:
            return response.json().get('text')
        else:
            print(f"Failed to transcribe audio: {response.content}")
            return None

import requests
import os
from tempfile import NamedTemporaryFile
from google.cloud import storage
import subprocess
import google.auth.transport.requests
import google.oauth2.id_token
import uuid

def get_google_cloud_token(audience):
    auth_req = google.auth.transport.requests.Request()
    id_token = google.oauth2.id_token.fetch_id_token(auth_req, audience)

    return id_token

def upload_blob(bucket_name, source_file_name, destination_blob_name):
    """Uploads a file to the bucket."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_filename(source_file_name)
    
        # Construct public url
        public_url = f"https://storage.googleapis.com/{bucket_name}/{destination_blob_name}"
        #print(f"Successfully uploaded file to {public_url}")
        return public_url
    except Exception as e:
        print(f"Failed to upload file: {e}")
        raise

def text_to_speech(text, bucket_name, destination_blob_name, voicevox_url, style_id):
    audience = f"{voicevox_url}/"
    auth_token = get_google_cloud_token(audience)
    headers = {
        'Authorization': f'Bearer {auth_token}'
    }
    
    #voicevox main
    query_endpoint = f"{voicevox_url}/audio_query"
    synthesis_endpoint = f"{voicevox_url}/synthesis"
    query_params = {
        'text': text,
        'style_id': style_id
    }

    query_response = requests.post(query_endpoint, params=query_params, headers=headers)

    if query_response.status_code == 200:
        query_data = query_response.json()
    else:
        print('Error: Failed to get audio query.')
        return

    synthesis_body = query_data

    synthesis_response = requests.post(synthesis_endpoint, json=synthesis_body, params={'style_id': style_id}, headers=headers)

    if synthesis_response.status_code == 200:        
        with NamedTemporaryFile(suffix=".wav", delete=False) as temp:
            temp.write(synthesis_response.content)
            temp.flush()

            # Convert the WAV file to M4A
            wav_path = temp.name
        
            # Upload the wav file
            public_url = upload_blob(bucket_name, wav_path, destination_blob_name)
        
            # Return the public url, local path of the file, and duration
            return public_url, wav_path
    else:
        print('Error: Failed to synthesize audio.')
        return
    
def delete_local_file(file_path):
    """Deletes a local file."""
    if os.path.isfile(file_path):
        os.remove(file_path)
        #print(f"Local file {file_path} deleted.")
    #else:
        #print(f"No local file found at {file_path}.")    

def delete_blob(bucket_name, blob_name):
    """Deletes a blob from the bucket."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.delete()
    #print(f"Blob {blob_name} deleted.")

def set_bucket_lifecycle(bucket_name, age):
    storage_client = storage.Client()
    bucket = storage_client.get_bucket(bucket_name)

    rule = {
        'action': {'type': 'Delete'},
        'condition': {'age': age}  # The number of days after object creation
    }
    
    bucket.lifecycle_rules = [rule]
    bucket.patch()

    #print(f"Lifecycle rule set for bucket {bucket_name}.")
    
def bucket_exists(bucket_name):
    """Check if a bucket exists."""
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    return bucket.exists()

def put_audio_voicevox(userId, response, BACKET_NAME, FILE_AGE, voicevox_url, style_id):
    if bucket_exists(BACKET_NAME):
        set_bucket_lifecycle(BACKET_NAME, FILE_AGE)
    else:
        print(f"Bucket {BACKET_NAME} does not exist.")
        return 'OK'
    filename = str(uuid.uuid4())
    blob_path = f'{userId}/{filename}.wav'
    public_url, local_path = text_to_speech(response, BACKET_NAME, blob_path, voicevox_url, style_id)
    return public_url, local_path
      

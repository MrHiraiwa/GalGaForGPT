import os
from openai import OpenAI
from datetime import datetime, time, timedelta
import pytz
import requests
from bs4 import BeautifulSoup
from google.cloud import storage
import io
import uuid

openai_api_key = os.getenv('OPENAI_API_KEY')
gpt_client = OpenAI(api_key=openai_api_key)
public_url = []
public_url_original = []
    
user_id = []
bucket_name = []
file_age = []


def clock(dummy):
    jst = pytz.timezone('Asia/Tokyo')
    nowDate = datetime.now(jst) 
    nowDateStr = nowDate.strftime('%Y/%m/%d %H:%M:%S %Z')
    return nowDateStr

def scraping(links):
    contents = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36" ,
    }
    
    for link in links:
        try:
            response = requests.get(link, headers=headers, timeout=5)  # Use headers
            response.raise_for_status()
            response.encoding = response.apparent_encoding
            html = response.text
        except requests.RequestException:
            html = "<html></html>"
            
        soup = BeautifulSoup(html, features="html.parser")

        # Remove all 'a' tags
        for a in soup.findAll('a'):
            a.decompose()

        content = soup.select_one("article, .post, .content")

        if content is None or content.text.strip() == "":
            content = soup.select_one("body")

        if content is not None:
            text = ' '.join(content.text.split()).replace("。 ", "。\n").replace("! ", "!\n").replace("? ", "?\n").strip()
            contents.append(text)

    return contents

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

def download_image(image_url):
    """ PNG画像をダウンロードする """
    response = requests.get(image_url)
    return io.BytesIO(response.content)

def upload_blob(bucket_name, source_stream, destination_blob_name, content_type='image/png'):
    """Uploads a file to the bucket from a byte stream."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)

        blob.upload_from_file(source_stream, content_type=content_type)
    
        public_url = f"https://storage.googleapis.com/{bucket_name}/{destination_blob_name}"
        return public_url
    except Exception as e:
        print(f"Failed to upload file: {e}")
        raise

def generate_image(prompt):
    filename = str(uuid.uuid4())
    blob_path = f'{user_id}/{filename}.png'
    preview_blob_path = f'{user_id}/{filename}_s.png'
    client = OpenAI()
    prompt = paint_prompt + "\n" + prompt
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_result = response.data[0].url
    except Exception as e:
        return e

    if bucket_exists(bucket_name):
        set_bucket_lifecycle(bucket_name, file_age)
    else:
        print(f"Bucket {bucket_name} does not exist.")
        return 'OK'

    # PNG画像をダウンロード
    png_image = download_image(image_result)

    # 元のPNG画像をアップロード
    public_url_original = upload_blob(bucket_name, png_image, blob_path)


    return "changed the scene."

def set_username(prompt):
    username = prompt
    return

def chatgpt_functions(GPT_MODEL, messages_for_api, USER_ID, BUCKET_NAME=None, FILE_AGE=None, PAINT_PROMPT=""):
    public_url_original = None
    user_id = USER_ID
    bucket_name = BUCKET_NAME
    file_age = FILE_AGE
    paint_prompt = PAINT_PROMPT
    username = ""
    bot_reply = ""
    try:
        response = gpt_client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages_for_api
        )
        print(response)  # レスポンスの構造を出力して確認
        bot_reply = response.choices[0].message.content
    except Exception as e:
        print(f"An error occurred: {e}")
        bot_reply = "An error occurred while processing the question"
    return bot_reply, public_url_original, username

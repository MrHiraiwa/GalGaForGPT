import os
from openai import OpenAI
from datetime import datetime, time, timedelta
import pytz
import requests
from bs4 import BeautifulSoup
from google.cloud import storage
import io
import uuid
import functions_config as cf
import json

openai_api_key = os.getenv('OPENAI_API_KEY')
gpt_client = OpenAI(api_key=openai_api_key)
public_url = []
public_url_original = []
    
user_id = []
bucket_name = []
file_age = []


def clock():
    jst = pytz.timezone('Asia/Tokyo')
    nowDate = datetime.now(jst) 
    nowDateStr = nowDate.strftime('%Y/%m/%d %H:%M:%S %Z')
    return "SYSTEM:現在時刻は" + nowDateStr + "です。"

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

def generate_image(paint_prompt, prompt):
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


    return "SYSTEM:風景を変更しました。", public_url_original

def set_username(prompt):
    username = prompt
    return f"SYSTEM: 名前を覚えたことを返信してください。", username

def run_conversation(GPT_MODEL, messages):
    try:
        response = gpt_client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages,
        )
        return response  # レスポンス全体を返す
    except Exception as e:
        print(f"An error occurred: {e}")
        return None  # エラー時には None を返す

def run_conversation_f(GPT_MODEL, messages):
    try:
        response = gpt_client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages,
            functions=cf.functions,
            function_call="auto",
        )
        return response  # レスポンス全体を返す
    except Exception as e:
        print(f"An error occurred: {e}")
        return None  # エラー時には None を返す

def chatgpt_functions(GPT_MODEL, messages_for_api, USER_ID, BUCKET_NAME=None, FILE_AGE=None, PAINT_PROMPT="", max_attempts=3):
    public_url_original = None
    user_id = USER_ID
    bucket_name = BUCKET_NAME
    file_age = FILE_AGE
    paint_prompt = PAINT_PROMPT
    username = ""
    attempt = 0
    i_messages_for_api = messages_for_api.copy()

    set_username_called = False
    clock_called = False
    generate_image_called = False

    while attempt < max_attempts:
        response = run_conversation_f(GPT_MODEL, i_messages_for_api)
        print(f"response: {response}")
        if response:
            function_call = response.choices[0].message.function_call
            if function_call:
                if function_call.name == "set_UserName" and not set_username_called:
                    set_username_called = True
                    arguments = json.loads(function_call.arguments)
                    bot_reply, username = set_username(arguments["username"])
                    i_messages_for_api.append({"role": "assistant", "content": bot_reply})
                    attempt += 1
                elif function_call.name == "clock" and not clock_called:
                    clock_called = True
                    bot_reply = clock()
                    i_messages_for_api.append({"role": "assistant", "content": bot_reply})
                    attempt += 1
                elif function_call.name == "generate_image" and not generate_image_called:
                    generate_image_called = True
                    arguments = json.loads(function_call.arguments)
                    bot_reply, public_url_original = generate_image(paint_prompt, arguments["prompt"])
                    i_messages_for_api.append({"role": "assistant", "content": bot_reply})
                    attempt += 1
                else:
                    response = run_conversation(GPT_MODEL, i_messages_for_api)
                    if response:
                        bot_reply = response.choices[0].message.content
                    else:
                        bot_reply = "An error occurred while processing the question"
                    return bot_reply, public_url_original, username                    
            else:
                return response.choices[0].message.content, public_url_original, username
        else:
            return "An error occurred while processing the question", public_url_original, username
    
    return bot_reply, public_url_original, username


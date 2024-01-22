from langchain.agents import initialize_agent, Tool
from langchain.agents import AgentType
from langchain_community.chat_models import ChatOpenAI
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from openai import OpenAI
from datetime import datetime, time, timedelta
import pytz
import requests
from bs4 import BeautifulSoup
from google.cloud import storage
import io
import uuid

public_url = []
public_url_original = []
    
user_id = []
bucket_name = []
file_age = []

GPT_MODEL = "gpt-3.5-turbo"

llm = ChatOpenAI(model=GPT_MODEL)

wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang='ja', doc_content_chars_max=1000, load_all_available_meta=True))

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
    global public_url_original
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
    global username
    username = prompt
    return

tools = [
    Tool(
        name = "Clock",
        func=clock,
        description="useful for when you need to know what time it is."
    ),
    Tool(
        name = "Scraping",
        func=scraping,
        description="useful for when you need to read a web page by specifying the URL. it is single-input tool."
    ),
    Tool(
        name = "Wikipedia",
        func=wikipedia,
        description="useful for when you need to Read dictionary page by specifying the word. it is single-input tool."
    ),
    Tool(
        name = "Painting",
        func= generate_image,
        description="If the emotion or scene changes, be sure to specify the emotion or scene in one sentence and execute."
    ),
    Tool(
        name = "set_UserName",
        func= set_username,
        description="You can set the name of the conversation partner. it is single-input tool."
    ),
]
mrkl = initialize_agent(tools, llm, agent=AgentType.OPENAI_FUNCTIONS, verbose=False, handle_parsing_errors="Check your output and make sure it conforms, use the Action/Action Input syntax")

def langchain_agent(question, USER_ID, BUCKET_NAME=None, FILE_AGE=None, PAINT_PROMPT=""):
    global user_id
    global bucket_name
    global file_age
    global public_url_original
    global username
    global paint_prompt
    
    public_url_original = None
    user_id = USER_ID
    bucket_name = BUCKET_NAME
    file_age = FILE_AGE
    paint_prompt = PAINT_PROMPT
    username = ""
    try:
        result = mrkl.run(question)
        return result, public_url_original, username
    except Exception as e:
        print(f"An error occurred: {e}")
        # 何らかのデフォルト値やエラーメッセージを返す
        return "An error occurred while processing the question"

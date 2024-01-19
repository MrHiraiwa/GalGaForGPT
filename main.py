import os
import pytz
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from google.cloud import firestore
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import tiktoken
import re

from voicevox import put_audio_voicevox
from whisper import get_audio

# 環境変数
openai_api_key = os.getenv('OPENAI_API_KEY')
secret_key = os.getenv('SECRET_KEY')
jst = pytz.timezone('Asia/Tokyo')
nowDate = datetime.now(jst) 
nowDateStr = nowDate.strftime('%Y/%m/%d %H:%M:%S %Z')
YOUR_AUDIENCE = os.getenv('YOUR_AUDIENCE')  # Google Cloud IAPのクライアントID
DEFAULT_USER_ID = 'default_user_id'  # ユーザーIDが取得できない場合のデフォルトID
GPT_MODEL = 'gpt-3.5-turbo'
BOT_NAME = 'さくら'
USER_NAME = 'たろう'
SYSTEM_PROMPT = 'あなたは有能な女性秘書です。あなたの名前はさくらです。'
PROLOGUE = 'そこは会社の社長室だった。黒髪ロングの眼鏡の似合う女性が話しかけてきた。'
MAX_TOKEN_NUM = 2000
FORGET_KEYWORDS = ['忘れて']
FORGET_MESSAGE = '過去ログを消去しました。'
BACKET_NAME = 'galgegpt'
FILE_AGE = 1 
VOICEVOX_URL = 'https://voicevox-engine-lt5y5bq47a-an.a.run.app'
VOICEVOX_STYLE_ID = 27

# Flask アプリケーションの初期化
app = Flask(__name__)
app.secret_key = os.getenv('secret_key', default='YOUR-DEFAULT-SECRET-KEY')

# Firestore クライアントの初期化
try:
    db = firestore.Client()
except Exception as e:
    print(f"Error creating Firestore client: {e}")
    raise

def validate_iap_jwt(iap_jwt, expected_audience):
    try:
        decoded_jwt = id_token.verify_token(
            iap_jwt, google_requests.Request(), audience=expected_audience,
            certs_url='https://www.gstatic.com/iap/verify/public_key')
        return (decoded_jwt['sub'], decoded_jwt['email'], '')
    except Exception as e:
        return (DEFAULT_USER_ID, None, '**ERROR: JWT validation error {}**'.format(e))

def response_filter(response,bot_name,user_name):
    date_pattern = r"^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} [A-Z]{3,4}"
    response = re.sub(date_pattern, "", response).strip()
    name_pattern1 = r"^"+ bot_name + ":"
    response = re.sub(name_pattern1, "", response).strip()
    name_pattern2 = r"^"+ bot_name + "："
    response = re.sub(name_pattern2, "", response).strip()
    name_pattern3 = r"^"+ user_name + ":"
    response = re.sub(name_pattern3, "", response).strip()
    name_pattern4 = r"^"+ user_name + "："
    response = re.sub(name_pattern4, "", response).strip()
    dot_pattern = r"^、"
    response = re.sub(dot_pattern, "", response).strip()
    dot_pattern = r"^ "
    response = re.sub(dot_pattern, "", response).strip()
    return response

@app.route('/', methods=['GET'])
def index():
    assertion = request.headers.get('X-Goog-IAP-JWT-Assertion')
    user_id, user_email, error_str = validate_iap_jwt(assertion, YOUR_AUDIENCE)
    
    # この情報をフロントエンドに渡す
    return render_template('index.html', user_id=user_id, user_email=user_email)

@app.route("/audiohook", methods=["POST"])
def audiohook_handler():
    user_message = []
    user_id = []
    audio_file = request.files['audio_data']
    user_message = get_audio(audio_file)
    print(f"user_message_v:{user_message}")
    user_id = request.form.get('user_id')
    return jsonify({"reply": user_message)

# Texthook ハンドラ
@app.route("/texthook", methods=["POST"])
def texthook_handler():
    user_message = []
    user_id = []
    data = request.json
    user_message = data.get("message")
    print(f"user_message_t:{user_message}")
    if isinstance(user_message, list):
        user_message = ' '.join(user_message)
    if user_message == "":
        return
    user_message = USER_NAME + ":" + user_message
    user_id = data.get("user_id")

    # Firestore からユーザー情報を取得
    doc_ref = db.collection(u'users').document(user_id)
    @firestore.transactional
    def update_in_transaction(transaction, doc_ref):
        encoding = tiktoken.encoding_for_model(GPT_MODEL)
        user_doc = doc_ref.get()
        public_url = []
        if user_doc.exists:
            user_data = user_doc.to_dict()
        else:
            user_data = {
                'messages': [],
                'updated_date_string': nowDate,
                'daily_usage': 0,
                'start_free_day': datetime.now(jst)
            }

        if FORGET_KEYWORDS[0] in user_message:
            user_data['messages'] = []
            user_data['updated_date_string'] = nowDate
            doc_ref.set(user_data, merge=True)
            return jsonify({"reply": FORGET_MESSAGE})

        total_chars = len(encoding.encode(SYSTEM_PROMPT)) + len(encoding.encode(user_message)) + sum([len(encoding.encode(msg['content'])) for msg in user_data['messages']])
        
        while total_chars > MAX_TOKEN_NUM and len(user_data['messages']) > 0:
            user_data['messages'].pop(0)

        # OpenAI API へのリクエスト
        messages_for_api = [{'role': 'system', 'content': SYSTEM_PROMPT}] + [{'role': msg['role'], 'content': msg['content']} for msg in user_data['messages']] + [{'role': 'user', 'content': user_message}]

        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={'Authorization': f'Bearer {openai_api_key}'},
            json={'model': GPT_MODEL, 'messages': messages_for_api},
            timeout=50
        )

        if response.status_code == 200:
            response_json = response.json()
            bot_reply = response_json['choices'][0]['message']['content'].strip()
            bot_reply = response_filter(bot_reply, BOT_NAME, USER_NAME)
            public_url, local_path = put_audio_voicevox(user_id, bot_reply, BACKET_NAME, FILE_AGE, VOICEVOX_URL, VOICEVOX_STYLE_ID)
            bot_reply = BOT_NAME + ":" + bot_reply

            # ユーザーとボットのメッセージをFirestoreに保存
            user_data['messages'].append({'role': 'user', 'content': user_message})
            user_data['messages'].append({'role': 'assistant', 'content': bot_reply})
            user_data['daily_usage'] += 1
            user_data['updated_date_string'] = nowDate
            doc_ref.set(user_data, merge=True)

            return jsonify({"reply": bot_reply, "audio_url": public_url})
        else:
            print(f"Error with OpenAI API: {response.text}")
            return jsonify({"error": "Unable to process your request"}), 500
    return update_in_transaction(db.transaction(), doc_ref)

@app.route('/get_chat_log', methods=['GET'])
def get_chat_log():
    user_id = request.args.get('user_id')
    doc_ref = db.collection(u'users').document(user_id)
    user_doc = doc_ref.get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        return jsonify(user_data['messages'])
    else:
        return jsonify([])

@app.route('/get_username', methods=['GET'])
def get_username():    
    return jsonify({"username": USER_NAME})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

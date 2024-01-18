import os
import pytz
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from google.cloud import firestore
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import tiktoken

# 環境変数
openai_api_key = os.getenv('OPENAI_API_KEY')
secret_key = os.getenv('SECRET_KEY')
jst = pytz.timezone('Asia/Tokyo')
nowDate = datetime.now(jst) 
nowDateStr = nowDate.strftime('%Y/%m/%d %H:%M:%S %Z')
YOUR_AUDIENCE = os.getenv('YOUR_AUDIENCE')  # Google Cloud IAPのクライアントID
DEFAULT_USER_ID = 'default_user_id'  # ユーザーIDが取得できない場合のデフォルトID
GPT_MODEL = 'gpt-3.5-turbo'
SYSTEM_PROMPT = '私は有能な秘書です。'
MAX_TOKEN_NUM = 2000
FORGET_KEYWORDS = ['忘れて']
FORGET_MESSAGE = '過去ログを消去しました。'

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

@app.route('/', methods=['GET'])
def index():
    assertion = request.headers.get('X-Goog-IAP-JWT-Assertion')
    user_id, user_email, error_str = validate_iap_jwt(assertion, YOUR_AUDIENCE)
    
    # この情報をフロントエンドに渡す
    return render_template('index.html', user_id=user_id, user_email=user_email)

# Webhook ハンドラ
@app.route("/webhook", methods=["POST"])
def webhook_handler():
    data = request.json
    user_message = data.get("message")
    user_id = data.get("user_id")
    doc_ref = db.collection(u'users').document(user_id)

    # トランザクションを使用した更新処理を呼び出す
    try:
        return update_in_transaction(db.transaction(), doc_ref, user_message)
    except Exception as e:
        print(f"Error in transaction: {e}")
        return jsonify({"error": "Internal server error"}), 500

@firestore.transactional
def update_in_transaction(transaction, doc_ref, user_message):
    encoding = tiktoken.encoding_for_model(GPT_MODEL)
    user_doc = doc_ref.get(transaction=transaction)
    if user_doc.exists:
        user_data = user_doc.to_dict()
    else:
        user_data = {
            'messages': [],
            'updated_date_string': nowDate,
            'daily_usage': 0,
            'start_free_day': datetime.now(jst)
        }
            
    total_chars = len(encoding.encode(SYSTEM_PROMPT)) + len(encoding.encode(user_message)) + sum([len(encoding.encode(msg['content'])) for msg in user_data['messages']])
        
    while total_chars > MAX_TOKEN_NUM and len(user_data['messages']) > 0:
        user_data['messages'].pop(0)
            
    # OpenAI API へのリクエスト
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {openai_api_key}'},
        json={'model': GPT_MODEL, 'messages': [{'role': 'system', 'content': SYSTEM_PROMPT}, {'role': 'user', 'content': user_message}]},
        timeout=50
    )

    if response.status_code == 200:
        response_json = response.json()
        bot_reply = response_json['choices'][0]['message']['content'].strip()

        # ユーザーとボットのメッセージをFirestoreに保存
        user_data['messages'].append({'role': 'user', 'content': user_message})
        user_data['messages'].append({'role': 'assistant', 'content': bot_reply})
        user_data['daily_usage'] += 1
        user_data['updated_date_string'] = nowDate
        doc_ref.set(user_data, merge=True)

        return jsonify({"reply": bot_reply})
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

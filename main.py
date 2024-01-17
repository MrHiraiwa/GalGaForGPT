import os
import pytz
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from google.cloud import firestore
import tiktoken

# 環境変数
openai_api_key = os.getenv('OPENAI_API_KEY')
secret_key = os.getenv('SECRET_KEY')
jst = pytz.timezone('Asia/Tokyo')
nowDate = datetime.now(jst) 
nowDateStr = nowDate.strftime('%Y/%m/%d %H:%M:%S %Z')

# Flask アプリケーションの初期化
app = Flask(__name__)
app.secret_key = os.getenv('secret_key', default='YOUR-DEFAULT-SECRET-KEY')

# Firestore クライアントの初期化
try:
    db = firestore.Client()
except Exception as e:
    print(f"Error creating Firestore client: {e}")
    raise
@app.route('/')
def index():
    return render_template('index.html')
    
# Webhook ハンドラ
@app.route("/webhook", methods=["POST"])
def webhook_handler():
    data = request.json
    user_message = data.get("message")
    user_id = data.get("user_id")

    # Firestore からユーザー情報を取得
    doc_ref = db.collection(u'users').document(user_id)
    user_doc = doc_ref.get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
    else:
        user_data = {
            'messages': [],
            'updated_date_string': nowDate,
            'daily_usage': 0,
            'start_free_day': datetime.now(jst)
        }

    # OpenAI API へのリクエスト
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {openai_api_key}'},
        json={'model': 'gpt-3.5-turbo', 'messages': [{'role': 'system', 'content': 'Your prompt here'}, {'role': 'user', 'content': user_message}]},
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

let userId = window.preloadedUserId; // サーバーサイドから提供されるユーザーID

function getUserIdFromCookie() {
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

function addMessageWithAnimation(chatBox, message, isUser) {
    var messageDiv = document.createElement('div');
    messageDiv.textContent = (isUser ? "You: " : "Bot: ") + message;
    messageDiv.className = 'message-animation'; // アニメーション用のクラスを追加
    chatBox.appendChild(messageDiv);

    // アニメーションが終了したら、スクロールを最新のメッセージに移動
    messageDiv.addEventListener('animationend', function() {
        messageDiv.classList.remove('message-animation');
        messageDiv.scrollIntoView({ behavior: 'smooth' }); // スムーズスクロール
    });
}


function sendMessage() {
    var message = document.getElementById("userInput").value;
    if (!message.trim()) {
        return;
    }

    var chatBox = document.getElementById("chatBox");
    var userMessageDiv = addBlankMessage(chatBox); // ユーザーメッセージ用の空白行を追加

    var postData = { message: message };
    if (userId !== null) {
        postData.user_id = userId;
    }

    fetch('/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        setUserMessage(userMessageDiv, message, true); // ユーザーメッセージを設定
        var botMessageDiv = addBlankMessage(chatBox); // ボットメッセージ用の空白行を追加
        setUserMessage(botMessageDiv, data.reply, false); // ボットメッセージを設定
        document.getElementById("userInput").value = ''; // 入力フィールドをクリア
    });
}


function addBlankMessage(chatBox) {
    var messageDiv = document.createElement('div');
    messageDiv.style.minHeight = "20px"; // 高さを持つ空のdivを作成
    chatBox.appendChild(messageDiv);
    return messageDiv;
}


function setUserMessage(messageDiv, message, isUser) {
    messageDiv.textContent = (isUser ? "You: " : "Bot: ") + message;
    messageDiv.className = 'message-animation';
    messageDiv.addEventListener('animationend', function() {
        messageDiv.classList.remove('message-animation');
        messageDiv.scrollIntoView({ behavior: 'smooth' }); // スムーズスクロール
    });
}


window.onload = function() {
    document.getElementById("chatContainer").style.display = "block";
    fetchChatLog(); // 会話ログを取得して表示する関数の呼び出し

    document.getElementById("userInput").addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // フォームの自動送信を防止
            sendMessage();
        }
    });
};

function fetchChatLog() {
    fetch(`/get_chat_log?user_id=${userId}`)
    .then(response => response.json())
    .then(data => {
        var chatBox = document.getElementById("chatBox");
        data.forEach(message => {
            addMessageWithAnimation(chatBox, message.content, message.role === 'user');
        });
    });
}

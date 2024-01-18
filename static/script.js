let userId = window.preloadedUserId; // サーバーサイドから提供されるユーザーID

function getUserIdFromCookie() {
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

function addMessageWithAnimation(chatBox, message, isUser) {
    var messageDiv = document.createElement('div');
    messageDiv.textContent = (isUser ? "You: " : "Bot: ") + message;
    messageDiv.className = 'message-animation';
    chatBox.appendChild(messageDiv);

    // スムーズスクロールの実行
    messageDiv.scrollIntoView({ behavior: 'smooth' });

}




function sendMessage() {
    var message = document.getElementById("userInput").value;
    if (!message.trim()) {
        return;
    }

    var chatBox = document.getElementById("chatBox");
    var userMessageDiv = addBlankMessage(chatBox);
    userMessageDiv.scrollIntoView({ behavior: 'smooth' }); // スムーズスクロール
    setUserMessage(userMessageDiv, message, true); // ユーザーメッセージを設定

    // 入力フィールドを直ちにクリア
    document.getElementById("userInput").value = '';

    // ユーザーIDの確認とメッセージデータの準備
    var postData = { message: message };
    if (userId !== null) {
        postData.user_id = userId;
    }

    // サーバーへのリクエスト
    fetch('/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        // ボットの返信をチャットボックスに表示
        var botMessageDiv = addBlankMessage(chatBox);
        userMessageDiv.scrollIntoView({ behavior: 'smooth' }); // スムーズスクロール
        setUserMessage(botMessageDiv, data.reply, false); // ボットメッセージを設定
    });
}


function addBlankMessage(chatBox) {
    var blankDiv = document.createElement('div');
    blankDiv.style.minHeight = '20px'; // 空白行に高さを設定
    chatBox.appendChild(blankDiv);
    return blankDiv;
}

function setUserMessage(messageDiv, message, isUser) {
    setTimeout(() => {
        messageDiv.textContent = (isUser ? "You: " : "Bot: ") + message;
        messageDiv.className = 'message-animation';
    }, 100); // 100ミリ秒後にメッセージを設定
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

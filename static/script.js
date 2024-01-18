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
    setUserMessage(userMessageDiv, message, true); // ユーザーメッセージを設定
    document.getElementById("userInput").disabled = true;  // 入力ボックスを無効化

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
        var botMessageDiv = addBlankMessage(chatBox);
        setUserMessage(botMessageDiv, data.reply, false); // ボットメッセージを設定
    });

    document.getElementById("userInput").value = ''; // 入力フィールドをクリア
}

function setUserMessage(messageDiv, message, isUser) {
    let fullMessage = (isUser ? "You: " : "Bot: ") + message;
    let i = 0;
    
    function typeWriter() {
        if (i < fullMessage.length) {
            messageDiv.textContent += fullMessage.charAt(i);
            i++;
            messageDiv.scrollIntoView({ behavior: 'smooth' }); // ここでスクロール実行
            setTimeout(typeWriter, 50);
        } else if (!isUser) {
            document.getElementById("userInput").disabled = false; // ボットメッセージのアニメーションが終わったら入力ボックスを有効化
        }
    }

    typeWriter();
    messageDiv.className = 'message-animation';
}


function addBlankMessage(chatBox) {
    var blankDiv = document.createElement('div');
    blankDiv.style.minHeight = '20px'; // 空白行に高さを設定
    chatBox.appendChild(blankDiv);
    return blankDiv;
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

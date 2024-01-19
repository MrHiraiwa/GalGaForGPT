let userId = window.preloadedUserId; // サーバーサイドから提供されるユーザーID

function getUserIdFromCookie() {
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

function playAudio(audioUrl) {
    if (audioUrl) {
        var audio = new Audio(audioUrl);
        audio.play();
    }
}

function addMessageWithAnimation(chatBox, message, isUser) {
    var messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.className = 'message-animation';
    chatBox.appendChild(messageDiv);

    // スムーズスクロールの実行
    messageDiv.scrollIntoView({ behavior: 'smooth' });

}

function sendMessage() {
    var userInput = document.getElementById("userInput");
    var sendButton = document.getElementById("sendButton");
    var message = userInput.value;
    if (!message.trim()) {
        return;
    }

    userInput.disabled = true;  // 入力ボックスを無効化
    sendButton.disabled = true; // 送信ボタンを無効化
    userInput.placeholder = "処理中は入力できません";

    var chatBox = document.getElementById("chatBox");
    var userMessageDiv = addBlankMessage(chatBox);

    fetch('/get_username')
    .then(response => response.json())
    .then(data => {
        const username = data.username;
        const fullMessage = username + ": " + message;

        setUserMessage(userMessageDiv, fullMessage, true);
    });

    // ボットへのリクエストを開始
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
        playAudio(data.audio_url); // 音声を再生
        var botMessageDiv = addBlankMessage(chatBox);
        setUserMessage(botMessageDiv, data.reply, false);
    });

    userInput.value = ''; // 入力フィールドをクリア
}

function setUserMessage(messageDiv, message, isUser) {
    let fullMessage = message;
    let i = 0;
    
    function typeWriter() {
        if (i < fullMessage.length) {
            messageDiv.textContent += fullMessage.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        } else {
            // アニメーション完了後、入力ボックスと送信ボタンを有効化
            document.getElementById("userInput").disabled = false;
            document.getElementById("sendButton").disabled = false;
            document.getElementById("userInput").placeholder = "ここに入力";
            if (!isUser) {
                document.getElementById("userInput").focus();
            }
        }
        messageDiv.scrollIntoView({ behavior: 'smooth' });
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
    document.body.classList.add('visible');
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
        // メッセージが全て追加された後、チャットボックスを最下部にスクロール
        scrollToBottom(chatBox);
    });
}

function scrollToBottom(chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
}

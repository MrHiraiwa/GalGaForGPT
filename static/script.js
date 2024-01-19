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
    var message = document.getElementById("userInput").value;
    if (!message.trim()) {
        return;
    }

    document.getElementById("userInput").disabled = true;  // 入力ボックスを無効化
    document.getElementById("sendButton").disabled = true;
    document.getElementById("userInput").placeholder = "処理中は入力できません"

    var chatBox = document.getElementById("chatBox");
    var userMessageDiv = addBlankMessage(chatBox);

    fetch('/get_username')
    .then(response => response.json())
    .then(data => {
        const username = data.username;
        const fullMessage = username + ": " + message;

        setUserMessage(userMessageDiv, fullMessage, true); // ユーザーのメッセージを表示

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
            setBotMessage(botMessageDiv, data.reply, false, () => {
                document.getElementById("userInput").disabled = false; // 入力ボックスを有効化
                document.getElementById("sendButton").disabled = false;
                document.getElementById("userInput").placeholder = "ここに入力"
                document.getElementById("userInput").focus();
            });
        });

        document.getElementById("userInput").value = ''; // 入力フィールドをクリア
    });
}

function setUserMessage(messageDiv, message, isUser) {
    let fullMessage = message;
    let i = 0;
    
    function typeWriter() {
        if (i < fullMessage.length) {
            messageDiv.textContent += fullMessage.charAt(i);
            i++;
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            setTimeout(typeWriter, 50);
        }
    }

    typeWriter();
    messageDiv.className = 'message-animation';
}

function setBotMessage(messageDiv, message, isUser, callback) {
    let fullMessage = message;
    let i = 0;
    
    function typeWriter() {
        if (i < fullMessage.length) {
            messageDiv.textContent += fullMessage.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        } else {
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            if (callback) {
                callback();  // コールバック関数を実行
            }
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

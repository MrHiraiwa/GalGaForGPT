let userId = getUserIdFromCookie(); // CookieからユーザーIDを取得

function getUserIdFromCookie() {
    // CookieからユーザーIDを取得するコード
    // この部分はロードバランサの設定に応じて変更する必要がある
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

function sendMessage() {
    var message = document.getElementById("userInput").value;
    var postData = { message: message };

    // userIdがある場合のみpostDataに追加
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
        var chatBox = document.getElementById("chatBox");
        chatBox.innerHTML += `<div>You: ${message}</div>`;
        chatBox.innerHTML += `<div>Bot: ${data.reply}</div>`;
    });
}

// ページ読み込み時にチャットコンテナを表示
window.onload = function() {
    document.getElementById("chatContainer").style.display = "block";
};

function sendMessage() {
    var message = document.getElementById("userInput").value;
    // メッセージが空でないことを確認
    if (!message.trim()) {
        return;
    }

    var postData = { message: message };

    // userIdがある場合のみpostDataに追加
    if (userId !== null) {
        postData.user_id = userId;
    }

    // その他のsendMessage関数のコード...

    // メッセージ送信後に入力フィールドをクリア
    document.getElementById("userInput").value = '';
}

// ページ読み込み時の処理
window.onload = function() {
    document.getElementById("chatContainer").style.display = "block";

    // キーボードイベントリスナーの追加
    document.getElementById("userInput").addEventListener('keypress', function(e) {
        // エンターキーが押されたかどうかをチェック
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
};

let userId = window.preloadedUserId; // サーバーサイドから提供されるユーザーID

function getUserIdFromCookie() {
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

function sendMessage() {
    var message = document.getElementById("userInput").value;
    if (!message.trim()) { // メッセージが空でないことを確認
        return;
    }

    var postData = { message: message };
    if (userId !== null) { // userIdがある場合のみpostDataに追加
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
        document.getElementById("userInput").value = ''; // メッセージ送信後に入力フィールドをクリア
    });
}

window.onload = function() {
    document.getElementById("chatContainer").style.display = "block";

    document.getElementById("userInput").addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // フォームの自動送信を防止
            sendMessage();
        }
    });
};

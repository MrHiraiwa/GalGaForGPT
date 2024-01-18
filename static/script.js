let userId = null; // ユーザーIDを初期化

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

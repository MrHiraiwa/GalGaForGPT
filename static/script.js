let userId = null; // ユーザーIDを初期化

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    userId = profile.getId(); // ユーザーIDを取得

    // ログインボタンを非表示にし、チャットコンテナを表示
    document.getElementById("loginButton").style.display = "none";
    document.getElementById("chatContainer").style.display = "block";
}

function onFailure(error) {
    console.log(error);
    // ログイン失敗時の処理。必要に応じてここにコードを追加
}

function sendMessage() {
    var message = document.getElementById("userInput").value;
    var postData = { message: message };

    if (userId !== null) {
        postData.user_id = userId; // ユーザーIDがある場合のみ、送信データに追加
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

function renderButton() {
    gapi.signin2.render('loginButton', {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': onSignIn,
        'onfailure': onFailure
    });
}

// ページ読み込み時にGoogleログインボタンをレンダリング
window.onload = function() {
    renderButton();
};

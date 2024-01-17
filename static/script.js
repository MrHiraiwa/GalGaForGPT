function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    var userId = profile.getId(); // ユーザーIDを取得

    // ログインボタンを非表示にし、チャットコンテナを表示
    document.getElementById("loginButton").style.display = "none";
    document.getElementById("chatContainer").style.display = "block";

    // チャットメッセージを送信する関数
    window.sendMessage = function() {
        var message = document.getElementById("userInput").value;
        fetch('/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message, user_id: userId })
        })
        .then(response => response.json())
        .then(data => {
            var chatBox = document.getElementById("chatBox");
            chatBox.innerHTML += `<div>You: ${message}</div>`;
            chatBox.innerHTML += `<div>Bot: ${data.reply}</div>`;
        });
    };
}

function onFailure(error) {
    console.log(error);
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

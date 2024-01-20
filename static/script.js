let userId = window.preloadedUserId; // サーバーサイドから提供されるユーザーID
let recorder, stream;
let chunks = [];

function getUserIdFromCookie() {
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find(row => row.startsWith('userId='));
    return userCookie ? userCookie.split('=')[1] : null;
}

let voice_onoff = false; // 音声のオン・オフ状態を管理する変数

// 音声のオン・オフを切り替えるボタンのイベントハンドラ
document.getElementById("voiceToggleButton").addEventListener("click", function() {
    voice_onoff = !voice_onoff; // 状態を反転
    updateVoiceButtonLabel(); // ボタンのラベル更新
});

// 音声のオン・オフ状態に応じてボタンのラベルを更新する関数
function updateVoiceButtonLabel() {
    const buttonLabel = voice_onoff ? "音声オン" : "音声オフ";
    document.getElementById("voiceToggleButton").innerText = buttonLabel;
}

function playAudio(audioUrl) {
    if (audioUrl) {
        var audio = new Audio(audioUrl);
        audio.play();
    }
}

function convertURLsToLinks(text) {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
    });
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

    document.getElementById("userInput").disabled = true;
    document.getElementById("sendButton").disabled = true;
    document.getElementById("audioButton").disabled = true;
    document.getElementById("userInput").placeholder = "処理中は入力できません";

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
        postData.voice_onoff = voice_onoff;

        fetch('/texthook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        })
        .then(response => response.json())
        .then(data => {
            if (voice_onoff){
                playAudio(data.audio_url); // 音声を再生
            }
            var botMessageDiv = addBlankMessage(chatBox);
            setBotMessage(botMessageDiv, data.reply, false, () => {
                // ボットのメッセージ表示が完了したら入力ボックスと送信ボタンを再度有効化
                document.getElementById("userInput").disabled = false;
                document.getElementById("sendButton").disabled = false;
                document.getElementById("audioButton").disabled = false;
                document.getElementById("userInput").placeholder = "ここに入力";
                document.getElementById("userInput").focus();
            });
        });

        document.getElementById("userInput").value = ''; // 入力フィールドをクリア
    });
}

function setUserMessage(messageDiv, message, isUser) {
    let fullMessage = convertURLsToLinks(message);
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
    let fullMessage = convertURLsToLinks(message);
    let i = 0;

    function typeWriter() {
        if (i < fullMessage.length) {
            messageDiv.textContent += fullMessage.charAt(i);
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            i++;
            setTimeout(typeWriter, 50);
        } else {
            if (callback) {
                callback(); // コールバック関数を実行
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
    document.getElementById("chatBox").style.display = "block";
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

function buttonDown() {
  document.getElementById('audioButton').classList.add('pressed');
  startRecording();
}

function buttonUp() {
  document.getElementById('audioButton').classList.remove('pressed');
  stopRecording();
}

async function startRecording() {
  chunks = [];
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.start();
    recorder.ondataavailable = e => chunks.push(e.data);
  } else {
    console.error('audio/webm;codecs=opus is not Supported');
  }
}

function stopRecording() {
  recorder.stop();
  recorder.onstop = async () => {
    let blob = new Blob(chunks, { 'type' : 'audio/webm; codecs=opus' });
    sendAudioData(blob); // この関数でサーバーにデータを送信
  };
    document.getElementById("userInput").disabled = true;
    document.getElementById("sendButton").disabled = true;
    document.getElementById("audioButton").disabled = true;
    document.getElementById("userInput").placeholder = "処理中は入力できません";
}

let message = ""; // この変数を関数の外で宣言

function sendAudioData(audioBlob) {
    const formData = new FormData();
    formData.append("audio_data", audioBlob, "audio.webm");

    fetch('/audiohook', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // ユーザーの音声入力をチャットボックスに表示
        if (data.reply) {
            message = data.reply;
            fetch('/get_username')
            .then(response => response.json())
            .then(data => {
                const username = data.username;
                var userMessageDiv = addBlankMessage(chatBox);
                const fullMessage = username + ": " + message;
                setUserMessage(userMessageDiv, fullMessage, true);
            });

            // ボットへのリクエストを開始
            var postData = { message: message }; // ここでmessage変数を使用
            if (userId !== null) {
                postData.user_id = userId;
            }
            postData.voice_onoff = voice_onoff;

            fetch('/texthook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            })
            .then(response => response.json())
            .then(data => {
                if (voice_onoff){
                    playAudio(data.audio_url); // 音声を再生
                }
                var botMessageDiv = addBlankMessage(chatBox);
                setBotMessage(botMessageDiv, data.reply, false, () => {
                    // ボットのメッセージ表示が完了したら入力ボックスと送信ボタンを再度有効化
                    document.getElementById("userInput").disabled = false;
                    document.getElementById("sendButton").disabled = false;
                    document.getElementById("audioButton").disabled = false;
                    document.getElementById("userInput").placeholder = "ここに入力";
                });
            });

            document.getElementById("userInput").value = ''; // 入力フィールドをクリア
        }
    });
}



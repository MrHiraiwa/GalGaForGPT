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

document.getElementById('downloadButton').addEventListener('click', function() {
    fetch('/generate_image?user_id=' + userId)
        .then(response => response.json())
        .then(data => {
            const imageUrl = data.img_url; // ここでimageUrlを定義
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = 'downloadedImage.png'; // ダウンロードされるファイル名を指定
            document.body.appendChild(link);
            link.click(); // リンクをプログラム的にクリック
            document.body.removeChild(link); // リンクを削除
        });
});

document.getElementById("userInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
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

function changeBackgroundImage(img_url) {
    document.body.style.backgroundImage = 'url(' + img_url + ')';
    document.body.classList.add('fade-in');

    // アニメーション終了後にクラスを削除する
    document.body.addEventListener('animationend', () => {
        document.body.classList.remove('fade-in');
    });
}


function addMessageWithAnimation(chatBox, message, isUser) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'message-animation';
    
    const urlRegex = /(https?:\/\/[A-Za-z0-9-._~:/?#[\]@!$&'()*+,;=]+)/g;
    let parts = message.split(urlRegex);

    parts.forEach(part => {
        if (part.match(urlRegex)) {
            // URLの場合はリンクとして追加
            const link = document.createElement('a');
            link.href = part;
            link.textContent = part;
            link.target = '_blank';
            messageDiv.appendChild(link);
        } else {
            // 非URLの場合はテキストとして処理
            // 改行を処理
            const lines = part.split('\n');
            lines.forEach((line, index) => {
                messageDiv.appendChild(document.createTextNode(line));
                if (index < lines.length - 1) {
                    messageDiv.appendChild(document.createElement('br'));
                }
            });
        }
    });

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
            img_url = data.img_url
            if (img_url){
                changeBackgroundImage(img_url);
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
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let fullMessage = message.split(urlRegex); // URLとその他のテキストを分割

    function createLinkElement(url) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = "_blank"; // 新しいタブでリンクを開く
        return link;
    }

    function typeWriter(text, callback) {
        let i = 0;
        let interval = setInterval(() => {
            if (i < text.length) {
                messageDiv.textContent += text.charAt(i);
                i++;
                chatBox.scrollTop = chatBox.scrollHeight; // スクロール
            } else {
                clearInterval(interval);
                callback(); // 次の部分の処理を開始
            }
        }, 50);
    }

    function processMessage(index) {
        if (index < fullMessage.length) {
            const part = fullMessage[index];
            if (part.match(urlRegex)) {
                messageDiv.appendChild(createLinkElement(part));
                processMessage(index + 1); // 次の部分へ
            } else {
                typeWriter(part, () => processMessage(index + 1));
            }
        }
    }

    processMessage(0);
    messageDiv.className = 'message-animation';
}


function setBotMessage(messageDiv, message, isUser, callback) {
    const urlRegex = /(https?:\/\/[A-Za-z0-9-._~:/?#[\]@!$&'()*+,;=]+|\n)/g;

    function createLinkElement(url) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = "_blank";
        return link;
    }

    function typeWriter(text, callback) {
        let i = 0;
        let interval = setInterval(() => {
            if (i < text.length) {
                if (text.charAt(i) === '\n') {
                    messageDiv.appendChild(document.createElement('br'));
                } else {
                    const textNode = document.createTextNode(text.charAt(i));
                    messageDiv.appendChild(textNode);
                }
                i++;
                chatBox.scrollTop = chatBox.scrollHeight;
            } else {
                clearInterval(interval);
                callback();
            }
        }, 50);
    }

    function processMessage(parts, index) {
        if (index < parts.length) {
            const part = parts[index];
            if (urlRegex.test(part) && part !== '\n') {
                messageDiv.appendChild(createLinkElement(part));
                processMessage(parts, index + 1);
            } else {
                typeWriter(part, () => processMessage(parts, index + 1));
            }
        } else {
            if (callback) {
                callback();
            }
        }
    }

    const parts = message.split(urlRegex);
    processMessage(parts, 0);
    messageDiv.className = 'message-animation';
}



function addBlankMessage(chatBox) {
    var blankDiv = document.createElement('div');
    blankDiv.style.minHeight = '20px'; // 空白行に高さを設定
    chatBox.appendChild(blankDiv);
    return blankDiv;
}

window.onload = function() {
    fetch('/get_loading_image')
    .then(response => response.json())
    .then(data => {
        const loading_image = data.loading_image;
        changeBackgroundImage("https://assets.st-note.com/img/1705837252860-vbWVUeeKw5.png");
    });
    const userId = window.preloadedUserId || 'default_user_id';
    fetchChatLog();
    fetch('/generate_image?user_id=' + userId)
    .then(response => response.json())
    .then(data => {
        const img_url = data.img_url;
        if (img_url) {
            changeBackgroundImage(img_url);
            document.getElementById('chatBox').style.opacity = "1";
            document.getElementById('userInput').style.opacity = "1";
            var buttons = document.getElementsByTagName('button');
            for (var i = 0; i < buttons.length; i++) {
                    buttons[i].style.opacity = "1";
                }
        } else {
            showBodyElements();
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
                var img_url = data.img_url
                if (img_url){
                    changeBackgroundImage(img_url);
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



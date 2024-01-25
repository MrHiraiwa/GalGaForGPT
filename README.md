# GalGaGPT

このリポジトリは、WEB上で動作するPythonベースのチャットボットです。このボットはChatGPT APIを使用して、ユーザからのメッセージに対してレスポンスを生成します。
このボットプログラムの機能や設置方法についての詳細は以下のページを確認してください。
(ページ準備中)

## 機能
以下の機能を持っています。：


- Googleアカウントログイン機能: Googleアカウントでログインできます。会話はユーザー毎に管理されます。 
- 画像生成機能: 背景画像はペイント用プロンプトを元に自動生成されます。会話途中の変更も可能です。
- インターネット検索機能: グーグル及びWikipediaの検索が可能です。
- 音声入力出力機能: OPENAI whisperによる音声入力。VOICEVOXによる音声出力が行えます、
- ユーザー名前設定機能: 会話の中でユーザー名の設定が行えます。
- 時刻確認機能: 会話の中で日時の確認が行えます。

## セットアップ
以下のステップに従ってセットアップしてください：
1. Google Cloud Runでデプロイします：Google Cloud Consoleでプロジェクトを作成しCloud Run APIを有効にし、本レポジトリを指定してデプロイします。 デプロイの際は以下の環境変数を設定する必要があります。
2. 同じプロジェクト内でFirestoreを有効にします：左側のナビゲーションメニューで「Firestore」を選択し、Firestoreをプロジェクトで有効にします。
3. データベースを作成します：Firestoreダッシュボードに移動し、「データベースの作成」をクリックします。「ネイティブ」モードを選択します。
4. Custom SearchのAPIを有効にします。
5. Cloud Strageのバケットをインターネット公開で設定します。
6. Cloud RunのURLに「/login」を付与して管理画面にログインし、パラメータを設定します
7. VOICEVOXを利用する場合はサーバを別途用意してください。

## 環境変数
- OPENAI_API_KEY: OpenAIのAPIキーを入力してください。
- GOOGLE_API_KEY: Google Cloud Pratformに発行したAPIキーを入力してください。
- GOOGLE_CSE_ID: Google Cloud PratformのCustom Search設定時に発行した検索エンジンIDを設定してください。
- SECRET_KEY: DBに保存するメッセージの暗号化と復号化に使用される秘密鍵です。適当な文字列を入れてください。
- ADMIN_PASSWORD: WEBの管理画面のログインに使用する管理者パスワードです。このシステムはインターネットから誰でも触れるので、必ず複雑なパスワードを設定してください。
- DATABASE_NAME: Firestoreのデータベース名を設定します。
- AUDIENCE: Identity Aware ProxyのIDを設定します。

## 注意
このアプリケーションはFlaskベースで作成されています。そのため、任意のウェブサーバー上にデプロイすることが可能ですが、前提としてはGoogle Cloud runでの動作を想定しています。デプロイ方法は使用するウェブサーバーによります。

## ライセンス
このプロジェクトはMITライセンスの下でライセンスされています。

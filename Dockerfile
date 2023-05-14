# Node.jsの公式Dockerイメージをベースにする
FROM node:14

# ワーキングディレクトリを設定
WORKDIR /usr/src/app

# パッケージ.jsonとパッケージ-lock.jsonをコピー
COPY package*.json ./

# プロジェクトの依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーションが動作するポートを指定
EXPOSE 8080

# アプリケーションを起動するコマンドを指定
CMD [ "node", "index.js" ]
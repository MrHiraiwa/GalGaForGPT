functions = [
    {
        # 関数の名称
        "name": "set_UserName",
        # 関数の機能説明
        "description": "You can set the name of the conversation partner.",
        # 関数のパラメータ
        "parameters": {
            "type": "object",
            # 各引数
            "properties": {
                "username": {
                    "type": "string",
                    # 引数の説明
                    "description": "ユーザーの名前"
                }
            }
        }
    },
    {
        # 関数の名称
        "name": "clock",
        # 関数の機能説明
        "description": "useful for when you need to know what time it is.",
    },
        {
        # 関数の名称
        "name": "generate_image",
        # 関数の機能説明
        "description": "When a topic comes up about places or emotions, it generates your emotions and scenery from a single sentence.",
        # 関数のパラメータ
        "parameters": {
            "type": "object",
            # 各引数
            "properties": {
                "prompt": {
                    "type": "string",
                    # 引数の説明
                    "description": "景色や感情"
                }
            }
        }
    }
]

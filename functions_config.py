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
        "description": ""Whenever a user mentions a change in location or emotion, you should trigger a function call. if the user clearly names a new location or describes a change in your emotional state, the function to update the location or emotional context should be activated. Look for explicit phrases like 'You are now at [location]' or 'you feel [emotion]' to initiate the relevant function."
",
        # 関数のパラメータ
        "parameters": {
            "type": "object",
            # 各引数
            "properties": {
                "prompt": {
                    "type": "string",
                    # 引数の説明
                    "description": "画像生成プロンプト"
                }
            }
        }
    }
]

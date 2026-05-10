import os
import glob

delete_text = """
## 🗑 プロジェクトの削除（アンインストール）

不要になったプロジェクトを削除する場合は、以下の手順を実行してください。

1. **GASプロジェクトの削除**
   - [Google Apps Script ダッシュボード](https://script.google.com/home) にアクセスします。
   - 対象のプロジェクトの右側にある「︙」メニューから「削除」を選択し、ゴミ箱に移動します。

2. **連携サービスの解除（該当する場合）**
   - BacklogやDiscordなどの外部サービスで設定したWebhook URLがある場合は、各サービスの設定画面からWebhookを削除してください。
   - 出力先として作成したスプレッドシートが不要な場合は、Googleドライブから削除してください。

3. **ローカル環境の整理**
   - ローカルのディレクトリ内にある `.clasp.json` を削除すると、GASプロジェクトとのリンクが解除されます。
"""

files = glob.glob('*/README.md')
files.append('README.md')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    if '🗑 プロジェクトの削除' in content:
        print(f"Already exists in {f}")
        continue
        
    # Find a good place to insert.
    # Usually before "## 🔗 関連リンク" or "## 📝 ライセンス"
    if '## 🔗 関連リンク' in content:
        content = content.replace('## 🔗 関連リンク', delete_text + '\n## 🔗 関連リンク')
    elif '## 📝 ライセンス' in content:
        content = content.replace('## 📝 ライセンス', delete_text + '\n## 📝 ライセンス')
    else:
        content += '\n' + delete_text

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Updated {f}")


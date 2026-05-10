import os
import glob
import re

files = glob.glob('*/README.md')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    original_content = content

    # Replace clasp open with clasp open-script
    content = content.replace('clasp open`', 'clasp open-script`')
    content = content.replace('clasp open\n', 'clasp open-script\n')

    # Add clasp create if not exists
    if 'clasp create' not in content:
        # Extract title
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else os.path.basename(os.path.dirname(f))
        
        create_block = f"""#### プロジェクトの作成（初回のみ）

```bash
clasp create --type standalone --title "{title}"
```

#### appsscript.jsonでの設定"""
        
        if '#### appsscript.jsonでの設定' in content:
            content = content.replace('#### appsscript.jsonでの設定', create_block)
        elif '### デプロイ' in content:
             create_block_alt = f"""### プロジェクトの作成（初回のみ）\n\n```bash\nclasp create --type standalone --title "{title}"\n```\n\n### デプロイ"""
             content = content.replace('### デプロイ', create_block_alt)
        else:
             print(f"Could not find a place to insert clasp create in {f}")

    if content != original_content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {f}")
    else:
        print(f"No changes for {f}")


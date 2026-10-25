---
name: customize-extract-fields
description: gmail-to-slack-with-filtering で Slack に通知・シートに記録する項目（スクリプトプロパティ EXTRACT_FIELDS）を作る・変える。サンプルメール（.eml ファイルや本文のコピー）と抜き出したい項目（企業名・氏名・所属部署・連絡先・都道府県など）を受け取り、メール本文の項目名を一字一句そのまま label にした JSON を作る。「この項目も通知したい」「抜き出す項目を変えたい」「（なし）になってしまう」と言われたら使う。
---

# 抜き出す項目（EXTRACT_FIELDS）を作る

利用者は非エンジニアを想定しています。JSON の書き方を説明させるのではなく、**完成した値をコピーするだけで済む形**で渡してください。

## 1. 材料を集める

次の2つを利用者に確認します。足りないものだけ聞いてください。

- **サンプルメール**: `.eml` ファイルのパス、または Gmail で開いた本文のコピー
- **抜き出したい項目**: 例「会社名、氏名、所属部署、電話番号、都道府県」

`.eml` の場合は、本文（text/plain）を取り出して読みます。

```bash
python3 -I -c "
import sys, email
from email import policy
m = email.message_from_file(open(sys.argv[1], encoding='utf-8', errors='replace'), policy=policy.default)
print('From:', m.get('From')); print('To:', m.get('To')); print('Subject:', m.get('Subject')); print('---')
print(m.get_body(preferencelist=('plain', 'html')).get_content())
" "<.emlのパス>"
```

From / To は `FROM_ADDRESSES` / `TO_ADDRESSES` の設定にも使えるので、あわせて伝えると親切です。

## 2. 本文の形式を見分ける

| 形式 | 本文の見え方 | label にするもの |
|---|---|---|
| 1行形式 | `会社名: サンプル株式会社` | `:` / `：` より前（`会社名`） |
| 段落形式 | `都道府県`（空行）`東京都` | 値の**直前の段落全体**（`都道府県`） |

どちらの形式も同じ JSON で設定できます（スクリプトが自動で見分けます）。

## 3. JSON を作る

```json
[
  {"name": "表示名", "label": "本文の項目名"}
]
```

守ること:
- **label は本文の項目名を一字一句そのまま**にする。比較は完全一致（前後の空白、連続する空白・改行の違いだけは無視される）。括弧内の注記も含める
  - 例: `氏名 漢字（ニックネーム不可。保険加入のため本名を記入ください）`
  - 本文で項目名が途中で改行されている場合は、改行を半角スペース1つに置き換える
- **name** は利用者が見て分かる短い名前にする。重複不可。次の固定列名は使えない: `記録日時` `受信日時` `件名` `From` `To` `Slack送信` `Gmailリンク` `メールID`
- メールの種類で同じ内容の項目名が違う場合（例: チケット種別ごと）は、**別々の項目として登録**し、name を区別する（例: `氏名` と `氏名（同伴者）`）
- **未回答になりうる項目のすぐ後ろに続く項目名も登録する**。段落形式では、未回答の項目は値の段落ごと消えるため、次の項目名が値として拾われる。次の項目名が登録済みなら「（なし）」と判定される
  - 例: フリーコメントの次に「プライバシーポリシーに同意いただけますか？」が続くなら、それも登録する（不要なら通知に出るだけで害はない）
- 利用者が挙げた項目が本文に見つからない場合は、勝手に作らず、似た項目名の候補を示して確認する

## 4. 抽出結果を確かめる

作った JSON でサンプル本文を実際に抽出し、結果を利用者に見せます。本文を一時ファイルに保存してから実行してください（一時ファイルは確認後に削除）。

```bash
node -e "
const fs=require('fs'),vm=require('vm');
const c={console};vm.createContext(c);
vm.runInContext(fs.readFileSync('Code.js','utf8'),c);
const fields=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const r=vm.runInContext('extractFields',c)(fs.readFileSync(process.argv[1],'utf8'),fields);
r.forEach(i=>console.log(i.found?'✅':'❌',i.name,'→',i.value));
" "<本文.txt>" "<fields.json>"
```

❌ の項目は label を見直します。

## 5. 利用者に渡す

次の形でまとめます。

1. **コピーする値**: 1行の JSON（スクリプトプロパティの値欄に貼りやすいよう改行なし）
2. **設定する場所**: GAS エディタ → ⚙️ プロジェクトの設定 → スクリプト プロパティ → `EXTRACT_FIELDS` の値を置き換えて保存
3. **確認方法**: GAS エディタで `previewExtraction` を実行し、すべて ✅ になるか見る
4. **補足**: 項目を追加するとスプレッドシートの右端に列が増えること、使わなくなった列は残ること

## 注意
- サンプルメールに含まれる**実在の個人情報を、ファイル・コミット・README に書き残さない**。説明に例が必要ならダミー値（山田 太郎、東京都 など）に置き換える
- `Code.js` の変更は不要です。プロパティの変更は push せずに次回の実行から反映されます

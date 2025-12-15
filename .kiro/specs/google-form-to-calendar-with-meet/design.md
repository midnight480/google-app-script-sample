# 設計文書

## 概要

Google Form to Calendar with Meet システムは、Googleフォームの回答を自動的にGoogle Calendarイベントに変換し、Google Meet URLを生成する統合システムです。このシステムは、組織外参加者のサポート、冪等性を保証する処理ログ、カスタムメール通知を提供します。

## アーキテクチャ

### 全体構成

```
Google Form (Form Service) → Spreadsheet → Apps Script (Bound) → Google Calendar API → Meet URL生成
                                   ↓
                             Processing Log → Email Notification
```

### 主要コンポーネント

1. **Google Form (Form Service)**: 組織外からもアクセス可能な入力フォーム、Form Serviceで管理
2. **Google Spreadsheet**: フォーム回答の保存と処理ログの管理
3. **Apps Script (Bound Script)**: スプレッドシートに紐付けられた処理エンジン
4. **Google Calendar API**: 共有カレンダーへのイベント作成
5. **MailApp**: カスタムメール通知の送信
6. **Form Service**: Googleフォームの作成、設定、管理を行うApps Scriptサービス

### トリガー設定

- **インストール型トリガー**: `onFormSubmit` イベントでスプレッドシート側に設定
- **実行タイミング**: フォーム送信時に即座に実行

## コンポーネントとインターフェース

### FormSubmissionProcessor

フォーム回答の処理を担当するメインコンポーネント

```typescript
interface FormSubmissionProcessor {
  processSubmission(event: FormSubmitEvent): ProcessingResult
  validateInput(submission: FormSubmission): ValidationResult
  checkDuplicateProcessing(rowIndex: number): boolean
}
```

### FormManager

Form Serviceを使用してGoogleフォームを管理

```typescript
interface FormManager {
  createForm(title: string): GoogleAppsScript.Forms.Form
  addRequiredFields(form: GoogleAppsScript.Forms.Form): void
  addOptionalFields(form: GoogleAppsScript.Forms.Form): void
  linkToSpreadsheet(form: GoogleAppsScript.Forms.Form, spreadsheetId: string): void
  configureFormSettings(form: GoogleAppsScript.Forms.Form): void
}
```

### CalendarEventCreator

Google Calendar APIを使用してイベントを作成

```typescript
interface CalendarEventCreator {
  createEventWithMeet(eventData: EventData): CalendarEvent
  generateMeetUrl(requestId: string): string
  validateCalendarPermissions(calendarId: string): boolean
}
```

### EmailNotificationSender

カスタムメール通知の送信を担当

```typescript
interface EmailNotificationSender {
  sendNotification(eventData: EventData, attendees: string[]): void
  buildEmailBody(eventData: EventData): string
  formatDateTime(date: Date, timezone: string): string
}
```

### ProcessingLogger

処理ログの管理と冪等性の保証

```typescript
interface ProcessingLogger {
  logProcessingStart(rowIndex: number): void
  logProcessingSuccess(rowIndex: number, eventId: string): void
  logProcessingError(rowIndex: number, error: Error): void
  isAlreadyProcessed(rowIndex: number): boolean
}
```

## データモデル

### FormSubmission

```typescript
interface FormSubmission {
  registrantEmail: string;        // 必須: 登録者メールアドレス
  notifyEmails?: string;          // オプション: 追加通知先（カンマ区切り）
  startDateTime: Date;            // 必須: 開始日時
  endDateTime: Date;              // 必須: 終了日時
  title: string;                  // 必須: イベントタイトル
  description?: string;           // オプション: イベント説明
}
```

### EventData

```typescript
interface EventData {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees: { email: string }[];
  conferenceData: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: 'hangoutsMeet' };
    };
  };
}
```

### ProcessingLogEntry

```typescript
interface ProcessingLogEntry {
  rowIndex: number;
  status: 'PROCESSING' | 'SUCCESS' | 'ERROR';
  eventId?: string;
  processedAt: Date;
  errorMessage?: string;
}
```

### EmailTemplate

```typescript
interface EmailTemplate {
  subject: string;
  body: string;
  includeCalendarInstructions: boolean;
}
```

## 設定管理

### スクリプトプロパティ

セキュリティ上の理由から、以下の設定値はスクリプトプロパティで管理します：

```javascript
// 必須設定
SHARED_CALENDAR_ID: "c_3f32dbf2385c308f36f97924b22ec7ba41bfdb8d090fb8d0a704b01083996db0@group.calendar.google.com"

// オプション設定
TIMEZONE: "Asia/Tokyo"
EMAIL_SUBJECT_PREFIX: "登録完了: "
```

### 設定初期化関数

```javascript
function initializeScriptProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  // 必須プロパティの設定
  if (!properties.getProperty('SHARED_CALENDAR_ID')) {
    properties.setProperty('SHARED_CALENDAR_ID', 'c_3f32dbf2385c308f36f97924b22ec7ba41bfdb8d090fb8d0a704b01083996db0@group.calendar.google.com');
  }
  
  // デフォルト値の設定
  if (!properties.getProperty('TIMEZONE')) {
    properties.setProperty('TIMEZONE', 'Asia/Tokyo');
  }
  
  if (!properties.getProperty('EMAIL_SUBJECT_PREFIX')) {
    properties.setProperty('EMAIL_SUBJECT_PREFIX', '登録完了: ');
  }
}
```

## エラーハンドリング

### 検証エラー

1. **必須フィールドチェック**: 登録者メール、開始/終了日時、タイトルの存在確認
2. **日時検証**: 終了日時が開始日時より後であることを確認
3. **メール形式検証**: 有効なメールアドレス形式の確認

### API エラー

1. **Calendar API エラー**: 権限不足、API制限、ネットワークエラーの処理
2. **Meet URL生成エラー**: 会議作成失敗時の代替処理
3. **メール送信エラー**: 送信失敗時のログ記録と部分的成功の処理

### 冪等性保証

1. **重複処理防止**: Processing Logによる処理済みチェック
2. **部分失敗対応**: 各ステップの成功/失敗を個別に記録
3. **再実行安全性**: 同じ入力に対して同じ結果を保証

## テスト戦略

### 単体テスト

- **入力検証**: 各種無効入力に対する適切なエラーハンドリング
- **日時解析**: 様々な日時フォーマットの正しい解析
- **メールアドレス処理**: 重複排除と形式検証
- **エラー条件**: API失敗、権限不足などの例外ケース

### プロパティベーステスト

プロパティベーステストには **Google Apps Script Testing Library** を使用し、各テストは最低100回の反復実行を行います。

- 各プロパティベーステストは設計文書の正確性プロパティを実装する単一のテストとして作成
- テストには `**Feature: google-form-to-calendar-with-meet, Property {number}: {property_text}**` 形式のコメントを付与
- ランダム入力生成による包括的なテストカバレッジを提供

### 統合テスト

- **エンドツーエンドフロー**: フォーム送信からメール通知までの完全なワークフロー
- **外部API統合**: Google Calendar APIとの実際の連携テスト
- **権限テスト**: 様々な権限レベルでの動作確認

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作です。本質的に、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: 包括的入力検証
*任意の* フォーム送信に対して、必須フィールド（登録者メール、開始日時、終了日時、タイトル）がすべて存在し、終了日時が開始日時より後であり、メールアドレスが有効な形式である場合のみ処理が続行される
**検証対象: 要件 1.1, 5.2, 5.5**

### プロパティ2: イベント作成とMeet URL生成
*任意の* 有効なフォームデータに対して、カレンダーイベントが作成され、Meet URLが生成されてイベントに添付される
**検証対象: 要件 1.2, 1.3**

### プロパティ3: 出席者リスト処理
*任意の* 登録者メールと追加通知メール（カンマ区切り）に対して、重複を排除し、有効なメールアドレスのみを含む出席者リストが作成され、すべての出席者がイベント招待に含まれる
**検証対象: 要件 2.1, 2.2, 2.3, 2.4**

### プロパティ4: 包括的メール通知
*任意の* 成功したイベント作成に対して、すべての出席者にメール通知が送信され、メール本文にはイベントタイトル、開始時刻、終了時刻、Meet URL、カレンダーID、追加手順が含まれる
**検証対象: 要件 3.1, 3.2, 3.3**

### プロパティ5: 日時フォーマット一貫性
*任意の* 日時値に対して、設定されたタイムゾーンで一貫したフォーマット（yyyy/MM/dd HH:mm）で表示される
**検証対象: 要件 3.4**

### プロパティ6: 処理冪等性
*任意の* フォーム送信に対して、同じ送信を複数回処理しても、最初の処理結果と同じ結果が得られ、重複したイベントは作成されない
**検証対象: 要件 4.1, 4.2**

### プロパティ7: 処理ログ完全性
*任意の* 処理試行に対して、処理ログにはイベントID（成功時）、処理タイムスタンプ、ステータス、エラー詳細（失敗時）が記録される
**検証対象: 要件 1.4, 4.3, 4.4**

### プロパティ8: 検証失敗時の安全性
*任意の* 無効な入力に対して、不完全なカレンダーイベントは作成されず、検証エラーが適切にログに記録される
**検証対象: 要件 1.5, 4.5**

### プロパティ9: オプションフィールド処理
*任意の* オプションフィールド（通知メール、イベント説明）が提供された場合、それらが処理に正しく含まれる
**検証対象: 要件 5.3**

### プロパティ10: 日時解析柔軟性
*任意の* 有効な日時フォーマットに対して、システムが正しく解析し、内部的に一貫した日時オブジェクトに変換する
**検証対象: 要件 5.4**

### プロパティ11: 外部アクセス設定
*任意の* 組織外参加者を含むイベントに対して、Meet URLが外部アクセス可能に設定される
**検証対象: 要件 2.5**

### プロパティ12: 一意リクエストID生成
*任意の* イベント作成リクエストに対して、重複会議作成を防ぐため一意のリクエストIDが含まれる
**検証対象: 要件 6.3**

### プロパティ13: Meet URL外部アクセス設定
*任意の* Meet URL生成に対して、適切な外部アクセス設定で会議データが設定される
**検証対象: 要件 6.2**
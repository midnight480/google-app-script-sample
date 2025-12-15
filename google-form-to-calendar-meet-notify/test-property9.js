const fs = require('fs');
const vm = require('vm');

// Google Apps Script環境をシミュレート
global.console = console;
global.JSON = JSON;
global.Date = Date;
global.Math = Math;
global.Utilities = {
  getUuid: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  formatDate: (date, timezone, format) => date.toISOString()
};

// PropertiesServiceのモック
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => {
      const props = {
        'SHARED_CALENDAR_ID': 'test-calendar-id',
        'TIMEZONE': 'Asia/Tokyo',
        'EMAIL_SUBJECT_PREFIX': '登録完了: ',
        'TEST_EMAIL_ADDRESS': 'test@example.com',
        '_CONFIG_INITIALIZED': 'true'
      };
      return props[key] || null;
    },
    setProperty: (key, value) => {},
    setProperties: (props) => {}
  })
};

// Sessionのモック
global.Session = {
  getScriptTimeZone: () => 'Asia/Tokyo'
};

// Code.jsを読み込み
const codeContent = fs.readFileSync('Code.js', 'utf8');
const propertyTestContent = fs.readFileSync('PropertyTests.js', 'utf8');
const testRunnerContent = fs.readFileSync('TestRunner.js', 'utf8');

// 実行コンテキストを作成
const context = vm.createContext(global);

try {
  // Code.jsを実行
  vm.runInContext(codeContent, context);
  
  // PropertyTests.jsを実行
  vm.runInContext(propertyTestContent, context);
  
  // TestRunner.jsを実行
  vm.runInContext(testRunnerContent, context);
  
  // プロパティ9の簡単なテストを実行
  const result = vm.runInContext('runSimplePropertyTest9()', context);
  console.log('プロパティテスト9結果:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ プロパティテスト9成功');
    process.exit(0);
  } else {
    console.log('❌ プロパティテスト9失敗');
    process.exit(1);
  }
  
} catch (error) {
  console.error('テスト実行エラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
}
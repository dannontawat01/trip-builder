const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}`);
  const apiKey = 'AIzaSyAYKwcLs7GIUNYhtiHnH36DXiaRbMWbh9o';
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, say 'ping'");
    console.log('Success!', result.response.text());
  } catch (e) {
    console.error('Error:', e.message);
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
  await testModel('gemini-3.5-flash');
}

run();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: 'sk-80a...66ee',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

async function testWebSearch() {
  try {
    const response = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: 'What is the population of Ompundja constituency in Namibia?' }],
      enable_search: true
    });
    
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWebSearch();

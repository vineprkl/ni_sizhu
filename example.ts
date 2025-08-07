// example.ts - 新版六爻 API 调用示例

async function runLiuYaoExample() {
  const baseUrl = "http://localhost:8000/api/liuyao";
  
  const params = new URLSearchParams({
    birthYear: "1990",
    year: "2008",
    month: "12",
    day: "23",
    hour: "8",
    minute: "37"
  });

  const url = `${baseUrl}?${params}`;

  console.log(`正在请求: ${url}`);
  console.log("=========================================");

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`错误: API返回状态 ${response.status}`);
      const errorText = await response.text();
      console.error(`错误详情: ${errorText}`);
      return;
    }

    const data = await response.json();

    console.log("✅ API 响应成功! 结果如下:");
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error("请求失败，请确保 main.ts 服务正在运行中。");
    console.error(error);
  }
}

// 运行示例
runLiuYaoExample();
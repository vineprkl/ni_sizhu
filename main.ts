// main.ts (The Real, Final, Perfect Version)

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { assert } from "https://deno.land/std@0.207.0/assert/assert.ts";
import { Buffer } from "node:buffer";
import iconv from "npm:iconv-lite";

async function getBaziChart(
  year: number, month: number, day: number, hour: number, minute: number,
  gender: number, province: string, city: string
): Promise<Record<string, any>> {
  console.log(`收到请求: year=${year}, province=${province}...`);

  const formData = {
    txtName: '某人', zty: 0, pid: province, cid: city, data_type: 0,
    cboYear: year, cboMonth: month, cboDay: day, cboHour: hour,
    cboMinute: minute, rdoSex: gender, submit: ' 排盘 '
  };

  const bodyString = Object.entries(formData)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
    
  const requestBody = iconv.encode(bodyString, 'gb2312');
  const url = "https://paipan.china95.net/BaZi/BaZi.asp";
  const headers = {
    'Accept': '*/*', 'Accept-Encoding': 'gzip, deflate', 'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'python-requests/2.31.0'
  };

  try {
    const response = await fetch(url, { method: 'POST', headers: headers, body: requestBody });
    if (!response.ok) { return { error: `请求失败: ${response.status} ${response.statusText}` }; }

    const responseBuffer = await response.arrayBuffer();
    const htmlContent = iconv.decode(Buffer.from(responseBuffer), 'gb2312');
    console.log("响应成功，开始最终解析...");

    const doc = new DOMParser().parseFromString(htmlContent, "text/html");
    assert(doc, "文档解析失败");
    
    const baziData: Record<string, any> = {};
    const divContent = doc.querySelector('div');
    if (!divContent) { return { error: "解析失败：未找到内容DIV" }; }
    
    // --- 最终修复：使用更强大的HTML处理方式 ---
    // 1. 获取 div 的内部 HTML
    let htmlString = divContent.innerHTML;
    // 2. 将所有 <br> 标签替换为换行符 \n
    htmlString = htmlString.replace(/<br\s*\/?>/gi, '\n');
    // 3. 剥离所有剩下的 HTML 标签 (如 <font>, <b>, <a>)，只留下纯文本
    const plainText = htmlString.replace(/<[^>]*>/g, '');
    // 4. 现在才进行分割和清理，得到一个完美的行数组
    const allTextLines = plainText.split('\n').map(line => line.trim().replace(/&nbsp;/g, ' ')).filter(Boolean);
    // --- 修复结束 ---

    // 使用这个完美的数组进行精准提取
    allTextLines.forEach(line => {
      if (line.startsWith('命主姓名')) {
        const parts = line.split('，');
        baziData['姓名'] = parts[0].replace('命主姓名：', '').trim();
        if (parts.length > 1) baziData['出生地'] = parts[1].replace('出生地：', '').replace('。', '').trim();
      } else if (line.startsWith('出生公历')) {
        baziData['公历'] = line.replace('出生公历：', '').split('(北京时间)')[0].trim();
      } else if (line.startsWith('出生农历')) {
        baziData['农历'] = line.replace('出生农历：', '').replace('。', '').trim();
      } else if (line.startsWith('乾造') || line.startsWith('坤造')) {
        const gan = line.split(/\s+/).filter(Boolean);
        baziData['四柱'] = { 类型: gan[0], 年柱天干: gan[1], 月柱天干: gan[2], 日柱天干: gan[3], 时柱天干: gan[4]?.split('（')[0].trim() };
      } else if (baziData['四柱'] && !baziData.四柱['年柱地支'] && (line.startsWith('酉') || line.startsWith('巳') || line.startsWith('未') || line.startsWith('辰') || line.startsWith('子') || line.startsWith('丑') || line.startsWith('寅') || line.startsWith('卯') || line.startsWith('午') || line.startsWith('申') || line.startsWith('戌') || line.startsWith('亥')) ) {
         const zhi = line.split(/\s+/).filter(Boolean);
         if (zhi.length >= 4) { Object.assign(baziData.四柱, { 年柱地支: zhi[0], 月柱地支: zhi[1], 日柱地支: zhi[2], 时柱地支: zhi[3] }); }
      } else if (line.startsWith('藏干')) {
        baziData['藏干'] = line.replace('藏干', '').split(/\s+/).filter(Boolean);
      } else if (line.startsWith('地势')) {
        baziData['地势'] = line.replace('地势', '').split(/\s+/).filter(Boolean);
      } else if (line.startsWith('纳音')) {
        baziData['纳音'] = line.replace('纳音', '').split(/\s+/).filter(Boolean);
      } else if (line.startsWith('节气：')) {
        baziData['节气'] = line.replace('节气：', '');
      } else if (line.startsWith('起大运周岁')) {
        baziData['起大运'] = line.replace('起大运周岁：', '');
      } else if (line.startsWith('※胎元')) {
        const parts = line.split(/\s+/).filter(Boolean);
        baziData['胎元'] = parts[0].replace('※胎元：', '');
        if (parts.length > 1) baziData['命宫'] = parts[1].replace('命宫：', '');
      } else if (line.startsWith('☆星座')) {
        const parts = line.split(/\s+/).filter(Boolean);
        baziData['星座'] = parts[0].replace('☆星座：', '').replace('。', '');
        baziData['生肖'] = parts[1].replace('生肖：', '').replace('。', '');
        baziData['二十八宿'] = parts[2].replace('二十八宿：', '').replace('。', '');
      } else if (line.startsWith('☆命主福元')) {
        baziData['命主福元'] = line.replace('☆命主福元：', '').replace('。', '');
      }
    });
    
    const dayunIndex = allTextLines.findIndex(l => l.startsWith('排大运：'));
    if (dayunIndex !== -1) {
      const rows = allTextLines.slice(dayunIndex + 1, dayunIndex + 6).map(l => l.split(/\s+/).filter(Boolean));
      baziData['大运'] = rows[1].slice(1).map((_, i) => ({
        运: rows[0][i], 干支: rows[1][i+1], 地势: rows[2][i],
        岁数: parseInt(rows[3][i+1]), 年份: parseInt(rows[4][i+1])
      }));
    }
    const jishenIndex = allTextLines.findIndex(l => l.startsWith('吉神凶煞：'));
    if (jishenIndex !== -1) {
        baziData['吉神凶煞'] = {};
        allTextLines.slice(jishenIndex + 1, jishenIndex + 5).forEach(line => {
            const parts = line.split(/\s+/).filter(Boolean);
            if(parts.length > 1) baziData.吉神凶煞[parts[0]] = parts.slice(1);
        });
    }

    console.log("✅ 最终解析完成！");
    return baziData;

  } catch (e) {
    return { error: `发生未知错误: ${e.message}` };
  }
}

// ... API服务部分保持不变 ...
console.log("===================================================");
console.log(" ✨ Deno 八字排盘 API 即将启动 (最终完美版) ✨");
console.log("===================================================");
Deno.serve({ port: 8000 }, async (req) => { const url = new URL(req.url); if (url.pathname === "/api/bazi") { console.log("\n接收到新的API调用..."); const params = url.searchParams; const year = parseInt(params.get("year") || ""); const month = parseInt(params.get("month") || ""); const day = parseInt(params.get("day") || ""); const hour = parseInt(params.get("hour") || ""); const province = params.get("province"); const city = params.get("city"); if (!year || !month || !day || !hour || !province || !city) { return new Response(JSON.stringify({ error: "缺少必须的参数" }), { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, }); } const result = await getBaziChart(year, month, day, hour, parseInt(params.get("minute") || "0"), parseInt(params.get("gender") || "1"), province, city); return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" }, }); } return new Response("路径未找到. 请访问 /api/bazi", { status: 404 }); });
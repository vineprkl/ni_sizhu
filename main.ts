// main.ts (Liu Yao Parser Upgraded)

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { assert } from "https://deno.land/std@0.207.0/assert/assert.ts";
import { Buffer } from "node:buffer";
import iconv from "npm:iconv-lite";

// ==============================================================================
// 八字排盘功能 (此处无改动)
// ==============================================================================
async function getBaziChart(
  year: number, month: number, day: number, hour: number, minute: number,
  gender: number, province: string, city: string
): Promise<Record<string, any>> {
    console.log(`八字请求: year=${year}, province=${province}...`);
    const formData = {
        txtName: '某人', zty: 0, pid: province, cid: city, data_type: 0,
        cboYear: year, cboMonth: month, cboDay: day, cboHour: hour,
        cboMinute: minute, rdoSex: gender, submit: ' 排盘 '
    };
    const bodyString = Object.entries(formData).map(([k, v]) => `${k}=${v}`).join('&');
    const requestBody = iconv.encode(bodyString, 'gb2312');
    const url = "https://paipan.china95.net/BaZi/BaZi.asp";
    const headers = { 'Accept': '*/*', 'Accept-Encoding': 'gzip, deflate', 'Connection': 'keep-alive', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'python-requests/2.31.0' };
    try {
        const response = await fetch(url, { method: 'POST', headers: headers, body: requestBody });
        if (!response.ok) { return { error: `请求失败: ${response.status} ${response.statusText}` }; }
        const responseBuffer = await response.arrayBuffer();
        const htmlContent = iconv.decode(Buffer.from(responseBuffer), 'gb2312');
        console.log("八字响应成功，开始解析...");
        const doc = new DOMParser().parseFromString(htmlContent, "text/html");
        assert(doc, "文档解析失败");
        const baziData: Record<string, any> = {};
        const divContent = doc.querySelector('div');
        if (!divContent) { return { error: "解析失败：未找到内容DIV" }; }
        let htmlString = divContent.innerHTML;
        htmlString = htmlString.replace(/<br\s*\/?>/gi, '\n');
        const plainText = htmlString.replace(/<[^>]*>/g, '');
        const allTextLines = plainText.split('\n').map(line => line.trim().replace(/&nbsp;/g, ' ')).filter(Boolean);
        allTextLines.forEach(line => {
            if (line.startsWith('命主姓名')) { const parts = line.split('，'); baziData['姓名'] = parts[0].replace('命主姓名：', '').trim(); if (parts.length > 1) baziData['出生地'] = parts[1].replace('出生地：', '').replace('。', '').trim(); }
            else if (line.startsWith('出生公历')) { baziData['公历'] = line.replace('出生公历：', '').split('(北京时间)')[0].trim(); }
            else if (line.startsWith('出生农历')) { baziData['农历'] = line.replace('出生农历：', '').replace('。', '').trim(); }
            else if (line.startsWith('乾造') || line.startsWith('坤造')) { const gan = line.split(/\s+/).filter(Boolean); baziData['四柱'] = { 类型: gan[0], 年柱天干: gan[1], 月柱天干: gan[2], 日柱天干: gan[3], 时柱天干: gan[4]?.split('（')[0].trim() }; }
            else if (baziData['四柱'] && !baziData.四柱['年柱地支'] && (line.startsWith('酉') || line.startsWith('巳') || line.startsWith('未') || line.startsWith('辰') || line.startsWith('子') || line.startsWith('丑') || line.startsWith('寅') || line.startsWith('卯') || line.startsWith('午') || line.startsWith('申') || line.startsWith('戌') || line.startsWith('亥')) ) { const zhi = line.split(/\s+/).filter(Boolean); if (zhi.length >= 4) { Object.assign(baziData.四柱, { 年柱地支: zhi[0], 月柱地支: zhi[1], 日柱地支: zhi[2], 时柱地支: zhi[3] }); } }
        });
        console.log("✅ 八字解析完成!");
        return baziData;
    } catch (e) { return { error: `发生未知错误: ${e.message}` }; }
}

// ==============================================================================
// 重构后的六爻排盘功能
// ==============================================================================
async function getLiuYaoChart(
  event: string, year: number, month: number, day: number, hour: number, minute: number
): Promise<Record<string, any>> {
  console.log(`六爻请求: event=${event}, year=${year}...`);
  const formData = { txtEvent: event, cboYear: year, cboMonth: month, cboDay: day, cboHour: hour, cboMinute: minute, rdoQiGua: 0, txtName: '某人', rdoSex: 1, rdoLiFa: 0, cboPanShi: 0, Submit: ' 排盘 ' };
  const bodyString = Object.entries(formData).map(([k, v]) => `${k}=${v}`).join('&');
  const requestBody = iconv.encode(bodyString, 'gb2312');
  const url = "https://paipan.china95.net/LiuYao/LiuYao.asp";
  const headers = { 'Accept': '*/*', 'Accept-Encoding': 'gzip, deflate', 'Connection': 'keep-alive', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'python-requests/2.31.0' };

  try {
    const response = await fetch(url, { method: 'POST', headers: headers, body: requestBody });
    if (!response.ok) { return { error: `请求失败: ${response.status} ${response.statusText}` }; }
    
    const responseBuffer = await response.arrayBuffer();
    const htmlContent = iconv.decode(Buffer.from(responseBuffer), 'gb2312');
    console.log("六爻响应成功，开始精确解析...");

    const doc = new DOMParser().parseFromString(htmlContent, "text/html");
    assert(doc, "文档解析失败");
    const liuyaoData: Record<string, any> = { "基本信息": {}, "卦象": {}, "爻位详情": [] };
    const divContent = doc.querySelector('div');
    if (!divContent) return { error: "解析失败：未找到核心内容DIV" };

    let htmlString = divContent.innerHTML.replace(/&nbsp;/g, ' ');
    htmlString = htmlString.replace(/<br\s*\/?>/gi, '\n');
    const plainText = htmlString.replace(/<[^>]*>/g, '');
    const lines = plainText.split('\n').map(l => l.trim()).filter(Boolean);

    // 提取基本信息
    lines.forEach(line => {
      if (line.startsWith('占问事宜：')) liuyaoData.基本信息['占问事宜'] = line.split('：')[1];
      else if (line.startsWith('公历：')) liuyaoData.基本信息['公历'] = line.split('：')[1];
      else if (line.startsWith('农历：')) liuyaoData.基本信息['农历'] = line.split('：')[1];
      else if (line.startsWith('神煞：')) liuyaoData.基本信息['神煞'] = line.split('：')[1];
      else if (line.startsWith('干支：')) liuyaoData.基本信息['干支'] = line.split('：')[1];
      else if (line.startsWith('(卦身：')) liuyaoData.基本信息['卦身'] = line.match(/\(([^)]+)\)/)?.[1];
    });

    // 提取主卦、变卦和空亡
    const guaLine = lines.find(l => l.startsWith('主变卦'));
    if (guaLine) {
        const match = guaLine.match(/主变卦\s+(.*?)\((.*?)\)\s+之\s+(.*?)\((.*?)\)\s+\[空亡:(.*?)\]/);
        if (match) {
            liuyaoData.卦象['主卦'] = match[1];
            liuyaoData.卦象['主卦宫位'] = match[2];
            liuyaoData.卦象['变卦'] = match[3];
            liuyaoData.卦象['变卦宫位'] = match[4];
            liuyaoData.卦象['空亡'] = match[5];
        }
    }

    // 提取爻位详情
    const yaoHelpers = ['青龙', '玄武', '白虎', '螣蛇', '勾陈', '朱雀'];
    const yaoLines = lines.filter(l => yaoHelpers.some(h => l.startsWith(h)));
    liuyaoData.爻位详情 = yaoLines.map(line => {
        const parts = line.split(/\s+/).filter(Boolean);
        const yao: Record<string, any> = { 神兽: parts[0] };
        
        // 复杂逻辑来切分主卦和变卦部分
        let mainGuaParts = [];
        let changeGuaParts = [];
        let marker = '';
        
        // 找到主卦和变卦的分界线（爻的符号）
        let splitIndex = -1;
        for(let i=1; i<parts.length; i++) {
            if(parts[i].includes('▅')) {
                splitIndex = i;
                break;
            }
        }
        
        // 分离伏神（如果存在）
        if (splitIndex > 1) {
            yao.伏神 = parts.slice(1, splitIndex).join(' ');
        }
        
        // 切分主卦和变卦
        const rest = parts.slice(splitIndex);
        let changeGuaStartIndex = -1;
        for(let i=1; i<rest.length; i++) {
            if(rest[i].includes('▅')) {
                changeGuaStartIndex = i;
                break;
            }
        }

        if (changeGuaStartIndex !== -1) {
            mainGuaParts = rest.slice(0, changeGuaStartIndex);
            changeGuaParts = rest.slice(changeGuaStartIndex);
        } else {
            mainGuaParts = rest;
        }

        if (mainGuaParts.includes('世')) marker = '世';
        if (mainGuaParts.includes('应')) marker = '应';
        
        yao.主卦爻 = mainGuaParts.filter(p => p !== '世' && p !== '应').join(' ');
        yao.变卦爻 = changeGuaParts.join(' ');
        yao.标记 = marker;
        
        return yao;
    });

    console.log("✅ 六爻解析完成!");
    return liuyaoData;
  } catch(e) {
    return { error: `发生未知错误: ${e.message}` };
  }
}

// ==============================================================================
// API 服务 (处理 /api/bazi 和 /api/liuyao)
// ==============================================================================
console.log("===================================================");
console.log(" ✨ API 服务启动中 (八字 + 六爻) ✨");
console.log("===================================================");
Deno.serve({ port: 8000 }, async (req) => { const url = new URL(req.url); console.log(`\n收到新请求: ${url.pathname}`); if (url.pathname === "/api/bazi") { const params = url.searchParams; const year = parseInt(params.get("year") || ""); const month = parseInt(params.get("month") || ""); const day = parseInt(params.get("day") || ""); const hour = parseInt(params.get("hour") || ""); const province = params.get("province"); const city = params.get("city"); if (!year || !month || !day || !hour || !province || !city) { return new Response(JSON.stringify({ error: "缺少八字排盘必须的参数" }), { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, }); } const result = await getBaziChart(year, month, day, hour, parseInt(params.get("minute") || "0"), parseInt(params.get("gender") || "1"), province, city); return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" }, }); } if (url.pathname === "/api/liuyao") { const params = url.searchParams; const event = params.get("event"); const year = parseInt(params.get("year") || ""); const month = parseInt(params.get("month") || ""); const day = parseInt(params.get("day") || ""); const hour = parseInt(params.get("hour") || ""); if (!event || !year || !month || !day || !hour) { return new Response(JSON.stringify({ error: "缺少六爻排盘必须的参数: event, year, month, day, hour" }), { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, }); } const result = await getLiuYaoChart(event, year, month, day, hour, parseInt(params.get("minute") || "0")); return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" }, }); } return new Response("路径未找到. 请访问 /api/bazi 或 /api/liuyao", { status: 404 }); });
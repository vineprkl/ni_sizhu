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

  } catch (e: any) {
    return { error: `发生未知错误: ${e.message}` };
  }
}

// =================================================================
// 六爻排盘核心功能 (V2 - Final, Robust Implementation)
// =================================================================

// 辅助函数：标准化爻象字符串
function standardizeYao(yaoStr: string): string {
    const cleaned = yaoStr.replace(/\s|　/g, '');
    if (cleaned.includes('○')) {
        return cleaned.length > 4 ? 'YangMoving' : 'YinMoving';
    }
    return cleaned.length > 4 ? 'Yang' : 'Yin';
}

// 辅助函数：解析爻辞（例如 "官鬼丙寅木"）
function parseYaoCi(yaoCi: string): { relation: string, stemBranch: string, fiveElement: string } {
    const fiveElementMap: { [key: string]: string } = { '金': 'Metal', '木': 'Wood', '水': 'Water', '火': 'Fire', '土': 'Earth' };
    return {
        relation: yaoCi.substring(0, 2),
        stemBranch: yaoCi.substring(2, 4),
        fiveElement: fiveElementMap[yaoCi.substring(4, 5)] || 'Unknown',
    };
}

// 核心函数：获取并解析六爻盘
async function getLiuYaoChart(
    year: number, month: number, day: number, hour: number, minute: number
): Promise<Record<string, any>> {

    // 1. 准备表单数据 (包含所有必需的预设值)
    const hourMap = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const earthlyBranch = hourMap[Math.floor((hour + 1) / 2) % 12];
    const formData: { [key: string]: string | number } = {
        txtYear: 1990, txtName: '某人', rdoSex: 1, txtEvent: '要问的事情',
        rdoLiFa: 0, cboYear: year, cboMonth: month, cboDay: day,
        cboHour: `${hour}-${earthlyBranch}`, cboMinute: minute,
        cboPanShi: 0, rdoQiGua: 0, cboGua1: '乾一', cboGua2: '乾一',
        cboYao5: '一根变　上爻', cboYao4: '一根变　上爻', cboYao3: '一根变　上爻',
        cboYao2: '一根变　上爻', cboYao1: '一根变　上爻', cboYao0: '一根变　上爻',
        txtNumber: 123, txtYear2: year, cboMonth2: month, cboDay2: day,
        cboHour2: hour, cboMinute2: minute, cboDateGuaSel: 0, cboGuaAdd: 0,
        txtGuaNumber: '', cboZhongShen: 0, guaXiang: 34098, // 使用一个有效的示例值
        Submit: '  排盘  '
    };

    // 2. 发起网络请求
    const bodyString = Object.entries(formData).map(([key, value]) => {
        const encodedValue = iconv.encode(value.toString(), 'gb2312');
        let urlEncoded = '';
        for (let i = 0; i < encodedValue.length; i++) {
            urlEncoded += '%' + encodedValue[i].toString(16).toUpperCase();
        }
        return `${key}=${urlEncoded}`;
    }).join('&');

    const url = "https://paipan.china95.net/LiuYao/LiuYao.asp";
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'python-requests/2.31.0' },
            body: bodyString
        });
        if (!response.ok) { return { error: `请求失败: ${response.status}` }; }

        const responseBuffer = await response.arrayBuffer();
        const htmlContent = iconv.decode(Buffer.from(responseBuffer), 'gb2312');

        // 3. 解析HTML
        const doc = new DOMParser().parseFromString(htmlContent, "text/html");
        assert(doc, "文档解析失败");
        const divContent = doc.querySelector('div');
        if (!divContent) { return { error: "解析失败：未找到内容DIV" }; }

        const allTextLines = divContent.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').split('\n').map(line => line.trim().replace(/&nbsp;/g, ' ')).filter(Boolean);
        
        // 4. 初始化最终结果对象
        const result: Record<string, any> = {
            divinationInfo: {}, temporalInfo: { ganZhi: {}, shenSha: {} },
            hexagrams: { main: { lines: [] }, resultant: { lines: [] } }
        };

        // 5. 逐行解析，填充结果
        allTextLines.forEach(line => {
            if (line.startsWith('求测人：')) {
                const match = line.match(/求测人：(?<desc>.*?)，(?<gender>男|女)，(?<birthYear>.*?)，(?<method>.*)/);
                if (match?.groups) {
                    result.divinationInfo.querent = {
                        description: match.groups.desc,
                        gender: match.groups.gender,
                        birthYear: match.groups.birthYear,
                    };
                    result.divinationInfo.method = match.groups.method;
                }
            } else if (line.startsWith('占问事宜：')) {
                result.divinationInfo.subject = line.replace('占问事宜：', '');
            } else if (line.startsWith('公历：')) {
                const match = line.match(/公历：(?<year>\d{4})年(?<month>\d{1,2})月(?<day>\d{1,2})日(?<hour>\d{1,2})时(?<minute>\d{1,2})分，(?<dow>.*?)。/);
                if (match?.groups) {
                    const g = match.groups;
                    result.temporalInfo.gregorian = `${g.year}-${g.month.padStart(2, '0')}-${g.day.padStart(2, '0')} ${g.hour.padStart(2, '0')}:${g.minute.padStart(2, '0')}:00`;
                    result.temporalInfo.dayOfWeek = g.dow;
                }
            } else if (line.startsWith('农历：')) {
                result.temporalInfo.lunar = line.replace('农历：', '').replace('。', '');
            } else if (line.startsWith('干支：')) {
                const match = line.match(/干支：(?<year>.*?)年\s+(?<month>.*?)月\s+(?<day>.*?)日\s+(?<hour>.*?)时/);
                if (match?.groups) {
                    result.temporalInfo.ganZhi = match.groups;
                }
                const guaShenMatch = line.match(/\(卦身：(.*?)\)/);
                if (guaShenMatch) result.temporalInfo.guaShen = guaShenMatch[1];
            } else if (line.startsWith('神煞：')) {
                 const shenShaMatch = line.match(/驿马-(.*?)\s*桃花-(.*?)\s*干禄-(.*?)\s*贵人-(.*)/);
                 if(shenShaMatch) {
                    result.temporalInfo.shenSha.yiMa = shenShaMatch[1];
                    result.temporalInfo.shenSha.taoHua = shenShaMatch[2];
                    result.temporalInfo.shenSha.ganLu = shenShaMatch[3];
                    result.temporalInfo.shenSha.guiRen = shenShaMatch[4].split('、');
                 }
            } else if (line.startsWith('主变卦')) {
                const match = line.match(/主变卦\s+(?<main>.*?)\s+之\s+(?<res>.*?)\s+\[空亡:(?<kw>.*?)\]/);
                if (match?.groups) {
                    result.hexagrams.main.name = match.groups.main.split('(')[0];
                    result.hexagrams.main.palace = match.groups.main.match(/\((.*?)\)/)?.[1];
                    result.hexagrams.resultant.name = match.groups.res.split('(')[0];
                    result.hexagrams.resultant.palace = match.groups.res.match(/\((.*?)\)/)?.[1];
                    result.temporalInfo.kongWang = match.groups.kw.split('、');
                }
            } else if (['青龙', '玄武', '白虎', '螣蛇', '勾陈', '朱雀'].some(s => line.startsWith(s))) {
                // 最终方案: "分步程序化解析"
                let cleaned = line.replace(/　/g, ' ').replace(/\s+/g, ' ').trim();
                cleaned = cleaned.replace(/([▅○])([^\s▅○])/g, '$1 $2');
                const parts = cleaned.split(' ');

                const mainLine: any = { position: 6 - result.hexagrams.main.lines.length, marker: null, hiddenGod: null };
                const resLine: any = { position: 6 - result.hexagrams.resultant.lines.length, marker: null };
                
                mainLine.sixGod = parts.shift();

                // 识别伏神
                if (parts[0] && parts[0].length === 5 && !parts[0].includes('▅')) {
                    mainLine.hiddenGod = parts.shift();
                }

                // 消费主卦爻象
                let mainYaoStr = '';
                while (parts[0] && (parts[0].includes('▅') || parts[0].includes('○'))) {
                    mainYaoStr += parts.shift();
                }
                mainLine.lineType = standardizeYao(mainYaoStr);
                mainLine.isMoving = mainLine.lineType.includes('Moving');

                // 消费主卦爻辞
                Object.assign(mainLine, parseYaoCi(parts.shift() || ''));

                // 检查主卦标记
                if (parts[0] === '世' || parts[0] === '应') {
                    mainLine.marker = parts.shift();
                }

                // 检查是否存在变卦信息
                if (parts.length > 0) {
                    let resYaoStr = '';
                    while (parts[0] && (parts[0].includes('▅') || parts[0].includes('○'))) {
                        resYaoStr += parts.shift();
                    }
                    resLine.lineType = standardizeYao(resYaoStr);
                    Object.assign(resLine, parseYaoCi(parts.shift() || ''));
                    if (parts[0] === '世' || parts[0] === '应') {
                        resLine.marker = parts.shift();
                    }
                } else {
                    // 无变卦信息，为静爻
                    resLine.lineType = mainLine.lineType.replace('Moving', ''); // Ensure it's not 'Moving'
                    const mainCiData = { relation: mainLine.relation, stemBranch: mainLine.stemBranch, fiveElement: mainLine.fiveElement };
                    Object.assign(resLine, mainCiData);
                }
                
                // 统一标记
                mainLine.marker = mainLine.marker || resLine.marker || null;
                resLine.marker = mainLine.marker;

                result.hexagrams.main.lines.push(mainLine);
                result.hexagrams.resultant.lines.push(resLine);
            }
        });

        return result;

    } catch (e: any) {
        return { error: `发生未知错误: ${e.message}` };
    }
}
// ... API服务部分 ...
console.log("===================================================");
console.log(" ✨ Deno 八字 & 六爻 API 即将启动 ✨");
console.log("===================================================");
Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);
  console.log(`\n接收到新的API调用: ${url.pathname}`);

  if (url.pathname === "/api/bazi") {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || "");
    const month = parseInt(params.get("month") || "");
    const day = parseInt(params.get("day") || "");
    const hour = parseInt(params.get("hour") || "");
    const province = params.get("province");
    const city = params.get("city");
    if (!year || !month || !day || !hour || !province || !city) {
      const usage = `调用格式: /api/bazi?year=1990&month=1&day=20&hour=15&province=江苏&city=无锡`;
      return new Response(JSON.stringify({ error: "缺少必需参数", usage: usage }), { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, });
    }
    const result = await getBaziChart(year, month, day, hour, parseInt(params.get("minute") || "0"), parseInt(params.get("gender") || "1"), province, city);
    return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" }, });
  }
  
  if (url.pathname === "/api/liuyao") {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || "");
    const month = parseInt(params.get("month") || "");
    const day = parseInt(params.get("day") || "");
    const hour = parseInt(params.get("hour") || "");
    const minute = parseInt(params.get("minute") || "0");

    if (!year || !month || !day || !hour) {
        const usage = `调用格式: /api/liuyao?year=2024&month=6&day=20&hour=11&minute=30`;
        return new Response(JSON.stringify({ error: "缺少必需参数", usage: usage }), { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, });
    }
    const result = await getLiuYaoChart(year, month, day, hour, minute);
    return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" }, });
  }

  return new Response("路径未找到. 请访问 /api/bazi 或 /api/liuyao", { status: 404 });
});
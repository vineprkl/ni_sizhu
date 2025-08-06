# test_proxy.py
import requests

# 代理服务器的地址
proxies = {
   'http': 'http://127.0.0.1:8080',
   'https': 'http://127.0.0.1:8080',
}

# 构造请求体（使用字节串，这是成功的关键）
payload = {
    'txtName': '某人'.encode('gb2312'),
    'zty': 0,
    'pid': '山东'.encode('gb2312'),
    'cid': '济南'.encode('gb2312'),
    'data_type': 0,
    'cboYear': 2005,
    'cboMonth': 5,
    'cboDay': 23,
    'cboHour': 9,
    'cboMinute': 0,
    'rdoSex': 1,
    'submit': ' 排盘 '.encode('gb2312')
}
url = "https://paipan.china95.net/BaZi/BaZi.asp"
headers = {
    'User-Agent': 'python-requests/2.31.0' # requests库的默认UA
}

print("Python脚本正在通过代理发送请求...")
# 发送请求时，加入 proxies 和 verify=False 参数
# verify=False 是为了信任 mitmproxy 自己生成的证书
response = requests.post(url, data=payload, headers=headers, proxies=proxies, verify=False)

print("Python脚本请求完成！请在 mitmweb 界面查看。")
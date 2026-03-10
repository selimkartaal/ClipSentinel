![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-beta-orange)
![Platform](https://img.shields.io/badge/platform-Chrome-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)


# ClipSentinel

Tarayıcıda kopyala/yapıştır işlemlerini izleyen, hassas veri sızıntılarını önlemeye yönelik hafif bir Chrome eklentisi.
Kurumsal ortamlarda çalışan SOC ve IT güvenlik ekipleri için, DLP ve iç tehditleri göz önüne alarak tasarlandı.

---

## Ne yapıyor?

Kullanıcı bir sayfada kopyalama veya yapıştırma yaptığında eklenti devreye girer. İçeriği lokalde yakalar, günlük kullanım limitini kontrol eder, kullanıcıdan onay alır ve veriyi arka plandaki agent'a iletir.

---

## Özellikler

**Chrome Extension**
- Kopyalama ve yapıştırma önleme — gerçek zamanlı, `Kopyalama` ve `Yapıştırma` olayları'leri üzerinden
- Kullanıcı onay ekranı — metin veya görsel içerik önizlemesiyle
- Karakter limiti kontrolü (varsayılan: 2000 karakter)
- Günlük token/yapıştırma limiti yönetimi
- Kopyalama eşik tabanlı otomatik blok mekanizması — tekrarlanan kopyalamalar kademeli blok süreleri tetikler (`blockSteps`)
- Site bazlı kurallar — her domain için `Kopylama`, `Yapıştırma`, ayrı ayrı ayarlanabilir
- Gizli mod — kullanıcıya görünmeden sessizce loglar
- Resim yapıştırma desteği — önizleme + backend'e base64 gönderimi
- Admin paneli (şifre korumalı) — ayarlar, site kuralları, blok yönetimi
- TR / EN / DE dil desteği

**Agent (`clipsentinel_agent.py`)**
- İki HTTP sunucu: discovery (varsayılan `:5000`) ve data (`:5001`)
- JSON ve CEF çıktı formatı
- TCP ve UDP protokol desteği
- UDP'de yığın gönderim — büyük paketler `CLIP|<id>|<idx>/<total>|<data>` formatında bölünerek iletilir
- Host bilgisi (hostname, IP, kullanıcı adı, OS) her payload'a eklenir

**Listener (`listener.ps1`)**

Geliştirme ve test amaçlı UDP dinleyici. Gelen yığınları birleştirir, CEF ve JSON payload'larını terminalde okunabilir formatta gösterir.

---

## Ekran Görüntüleri

### Popup
![Popup](images/popup.png)

### Metin Yapıştırma Onayı
![Metin Yapıştırma Onayı](images/clipText.png)

### Görsel Yapıştırma Onayı
![Görsel Yapıştırma Onayı](images/clipImage.png)

### Kopyalama Bloğu
![Kopyalama Bloğu](images/copyBlock.png)

### Admin Girişi
![Admin Girişi](images/login.png)

### Ayarlar Paneli
![Ayarlar Paneli](images/settings.png)

### Agent Çıktısı
![Agent Çıktısı](images/Agent.png)

### SIEM / Backend Çıktısı
![SIEM Çıktısı](images/outputText.png)

---

## Kurulum

```bash
git clone https://github.com/selimkartaal/ClipSentinel.git
```

`chrome://extensions` adresine git, Geliştirici özelliğini aç, "Load unpacked" ile `Chrome Extension/` klasörünü yükle.

Kurumsal dağıtım için GPO veya MDM üzerinden merkezi yönetim önerilir.

---

## Konfigürasyon

Admin şifresi SHA-256 hash olarak `background.js` içinde tutulur.
Ayarlar `chrome.storage.local`'da saklanır, Options sayfasından yönetilir.

```js
{
  discoveryUrl: "http://127.0.0.1:5000",
  language: "TR",                           // TR | EN | DE
  dailyLimit: 10,                           // -1 = limitsiz
  siteRules: {
    "chatgpt.com":     { canCopy: false, canPaste: true,  stealthCopy: false },
    "claude.ai":       { canCopy: false, canPaste: true,  stealthCopy: false },
    "crm.company.com": { canCopy: true,  canPaste: false, stealthCopy: false }
  },
  blockSteps: [1, 5, 10, 30, 60, 480, -1], // dakika; -1 = kalıcı
  counterResetMinutes: 1,
  copyThreshold: 5
}
```

---

## Agent

```bash
python clipsentinel_agent.py --format cef  --protocol udp --target 192.168.1.100:5600
python clipsentinel_agent.py --format json --protocol tcp --target 192.168.1.100:5600
```

| Parametre | Açıklama | Varsayılan |
|-----------|----------|------------|
| `--format` | `json` \| `cef` | zorunlu |
| `--protocol` | `tcp` \| `udp` | zorunlu |
| `--target` | `IP:PORT` | zorunlu |
| `--discovery-port` | Discovery HTTP portu | `5000` |
| `--data-port` | Clipboard data HTTP portu | `5001` |
| `--chunk-size` | UDP max paket boyutu (byte) | `1200` |

`start_agent.bat` ile parametreleri düzenleyip tek tıkla başlatılabilir.

---

## Listener (PowerShell)

```powershell
.\listener.ps1 -Port 5600
```

Gelen UDP paketlerini toplar, yığınları birleştirir; CEF ve JSON formatlarını ayrıştırıp renkli çıktı verir.

---

## Backend Payload

```json
{
  "act": "yapıştırma",
  "type": "text",
  "mime": "text/plain",
  "data": "...",
  "pageUrl": "https://chatgpt.com",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

Agent bu payload'ı alıp host bilgisiyle (hostname, IP, kullanıcı, OS) zenginleştirerek hedef SIEM/listener'a iletir.

---

## Kullanım Senaryoları

- Insider threat önleme
- DLP akışları
- AI prompt güvenliği (ChatGPT, Claude, Gemini vb. için varsayılan kurallar dahil)
- SIEM / SOAR entegrasyonu (CEF veya JSON)

---

## Splunk Entegrasyonu

### Index & Sourcetype

```
index=clipsentinel sourcetype=clipsentinel:yapıştırma
```

```ini
# inputs.conf
[http://clipsentinel]
token = <HEC_TOKEN>
index = clipsentinel
sourcetype = clipsentinel:yapıştırma

# props.conf
[clipsentinel:yapıştırma]
KV_MODE = json
TIME_PREFIX = "timestamp":
TIME_FORMAT = %s
```

---

### Temel Sorgular

**Tüm olayları listele**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| table _time, host, username, pageUrl, act, mime, data
| sort -_time
```

**Kopyalama blok olayları**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma act="Kopyalama_blocked"
| table _time, host, username, pageUrl
| sort -_time
```

**TCKN tespiti**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| rex field=data "(?P<tckn>\b[1-9]\d{10}\b)"
| eval tckn_masked=substr(tckn,1,3)+"****"+substr(tckn,8,4)
| table _time, host, username, pageUrl, tckn_masked
```
> Regex: `\b[1-9]\d{10}\b` — 11 rakam, ilk basamak 0 olamaz.

**IBAN tespiti**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| rex field=data "(?P<iban>TR\d{2}[0-9A-Z]{22})"
| eval iban_masked="TR"+substr(iban,3,4)+"****"+substr(iban,21,6)
| table _time, host, username, pageUrl, iban_masked
```

**Kredi kartı tespiti**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| rex field=data "(?P<cc>4[0-9]{12,15}|5[1-5][0-9]{14}|3[47][0-9]{13})"
| eval cc_masked="****-****-****-"+substr(cc,-4)
| table _time, host, username, pageUrl, cc_masked
```

**Keyword analizi**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| eval hit=case(
    match(data,"(?i)gizli|confidential|secret|password|api.?key|token"),"sensitive_keyword",
    match(data,"(?i)şifre|parola"),"credential_keyword",
    true(),"none")
| where hit!="none"
| stats count by hit, username, host
| sort -count
```

---

### Korelasyon Kuralları

**Kısa sürede yoğun yapıştırma aktivitesi**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| bucket _time span=15m
| stats count as event_count by _time, username, host
| where event_count >= 10
| eval alert="15 dakikada "+event_count+" yapıştırma olayı: "+username
```

**Mesai dışı aktivite**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| eval hour=strftime(_time,"%H")
| where hour<8 OR hour>18
| table _time, host, username, pageUrl
| sort -_time
```

**Şüpheli domain'lere yapıştırma**
```spl
index=clipsentinel sourcetype=clipsentinel:yapıştırma
| where match(pageUrl,"pastebin\.com|hastebin\.com|ghostbin\.com|0bin\.net")
| table _time, host, username, pageUrl
```

---

### Regex Referans

| Veri Tipi | Regex |
|-----------|-------|
| TCKN | `\b[1-9]\d{10}\b` |
| IBAN (TR) | `TR\d{2}[0-9A-Z]{22}` |
| Kredi Kartı | `4[0-9]{12,15}\|5[1-5][0-9]{14}\|3[47][0-9]{13}` |
| E-posta | `[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}` |
| Telefon (TR) | `(?:\+90\|0)?5[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}` |

---

## Yol Haritası

- Merkezi yönetim paneli (ajan görünümü)
- Policy tabanlı içerik motoru (BLOCK / WARN / LOG / ALLOW)
- ML destekli risk skorlama
- LLM destekli içerik sınıflandırma
- Native alarm üretimi (SIEM gerektirmez)
- Tenant bazlı kullanım takibi
- SOAR playbook entegrasyonu
- Firefox / Edge desteği

---

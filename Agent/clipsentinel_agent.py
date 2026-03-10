"""
ClipSentinel Agent
------------------
Kullanim:
  python clipsentinel_agent.py --format json --protocol udp --target 192.168.1.100:5600
  python clipsentinel_agent.py --format cef  --protocol udp --target 192.168.1.100:5600
  python clipsentinel_agent.py --format json --protocol tcp --target 192.168.1.100:5600

Parametreler:
  --format         : json | cef          (zorunlu)
  --protocol       : tcp | udp           (zorunlu)
  --target         : IP:PORT             (zorunlu)
  --discovery-port : varsayilan 5000
  --data-port      : varsayilan 5001
  --chunk-size     : UDP chunk boyutu byte cinsinden (varsayilan: 1200)
"""

import argparse
import json
import logging
import platform
import socket
import sys
import datetime
import threading
import getpass
import uuid
import math
from http.server import BaseHTTPRequestHandler, HTTPServer

# --- Logging -----------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("ClipSentinel")

# --- Host Bilgisi ------------------------------------------------------------
def get_host_info():
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "unknown"
    username = getpass.getuser()
    os_name = platform.system() + " " + platform.release()
    return {
        "hostname": hostname,
        "local_ip": local_ip,
        "username": username,
        "os": os_name
    }

HOST_INFO = get_host_info()
log.info("Host bilgisi: {}".format(HOST_INFO))

# --- Target Parser -----------------------------------------------------------
def parse_target(target_str):
    try:
        host, port_str = target_str.rsplit(":", 1)
        return host.strip(), int(port_str.strip())
    except Exception:
        raise ValueError("--target formati yanlis. Dogru format: IP:PORT")

# --- Format Fonksiyonlari ----------------------------------------------------
def build_json_payload(clip_data):
    return json.dumps({
        "timestamp": clip_data.get("timestamp", datetime.datetime.utcnow().isoformat()),
        "host": HOST_INFO,
        "clipboard": {
            "act":      clip_data.get("act", "paste"),   # copy | paste | copy_blocked
            "type":     clip_data.get("type", "text"),
            "mime":     clip_data.get("mime", "text/plain"),
            "data":     clip_data.get("data", ""),
            "page_url": clip_data.get("pageUrl")
        }
    }, ensure_ascii=False)

def build_cef_payload(clip_data):
    now = datetime.datetime.utcnow().strftime("%b %d %Y %H:%M:%S")
    raw_msg = clip_data.get("data", "")
    if isinstance(raw_msg, bytes):
        raw_msg = raw_msg.decode("utf-8", errors="replace")
    clean_msg = (raw_msg
        .replace("\\", "\\\\")
        .replace("\r\n", "\\n")
        .replace("\r", "\\n")
        .replace("\n", "\\n")
        .replace("\t", "\\t")
        .replace("|", "\\|")
        .replace("=", "\\=")
    )
    ext_parts = [
        "rt={}".format(now),
        "src={}".format(HOST_INFO["local_ip"]),
        "shost={}".format(HOST_INFO["hostname"]),
        "suser={}".format(HOST_INFO["username"]),
        "act={}".format(clip_data.get("act", "paste")),   # ← CEF act field
        "requestUrl={}".format(clip_data.get("pageUrl", "")),
        "fileType={}".format(clip_data.get("mime", "text/plain")),
        "msg={}".format(clean_msg)
    ]
    extension = " ".join(ext_parts)
    return "CEF:0|ClipSentinel|ClipSentinel Agent|1.0|CLIP001|Clipboard Capture|3|{}".format(extension)

# --- UDP Chunked Send --------------------------------------------------------
# Paket formati: CLIP|<uuid4_8char>|<idx>/<total>|<data>
# Ornek:         CLIP|a3f9b2c1|0/3|CEF:0|ClipSentinel...
CHUNK_HEADER_SIZE = 30  # "CLIP|xxxxxxxx|000/000|" icin sabit rezerv

def udp_send_chunked(sock, data_str, host, port, chunk_size):
    payload_bytes = data_str.encode("utf-8")
    msg_id = uuid.uuid4().hex[:8]  # kisa unique id

    # Her chunk'a dusen max veri boyutu
    max_data = chunk_size - CHUNK_HEADER_SIZE
    total_bytes = len(payload_bytes)
    total_chunks = max(1, math.ceil(total_bytes / max_data))

    for i in range(total_chunks):
        chunk_data = payload_bytes[i * max_data: (i + 1) * max_data]
        header = "CLIP|{}|{}/{}|".format(msg_id, i, total_chunks).encode("utf-8")
        packet = header + chunk_data
        sock.sendto(packet, (host, port))
        log.debug("UDP chunk gonderildi: {}/{} | {} bytes".format(i+1, total_chunks, len(packet)))

    log.info("UDP gonderildi -> {}:{} | {} chunks | {} bytes".format(
        host, port, total_chunks, total_bytes
    ))

# --- Forwarder ---------------------------------------------------------------
def forward(clip_data, fmt, protocol, host, port, chunk_size):
    try:
        if fmt == "json":
            raw = build_json_payload(clip_data)
        else:
            raw = build_cef_payload(clip_data)

        if protocol == "udp":
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                udp_send_chunked(s, raw, host, port, chunk_size)

        elif protocol == "tcp":
            data = (raw + "\n").encode("utf-8", errors="replace")
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(5)
                s.connect((host, port))
                s.sendall(data)
            log.info("TCP gonderildi -> {}:{} | {} bytes".format(host, port, len(data)))

    except Exception as e:
        log.error("Forward hatasi: {}".format(e))

# --- Discovery Handler -------------------------------------------------------
def make_discovery_handler(data_port):
    class DiscoveryHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/info":
                body = json.dumps({
                    "service": "ClipSentinel",
                    "version": "1.0",
                    "dataPort": data_port,
                    "host": HOST_INFO
                }).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", len(body))
                self.end_headers()
                self.wfile.write(body)
            else:
                self.send_response(404)
                self.end_headers()

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def log_message(self, format, *args):
            log.debug("[Discovery] " + format % args)

    return DiscoveryHandler

# --- Data Handler ------------------------------------------------------------
def make_data_handler(fmt, protocol, host, port, chunk_size):
    class DataHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path in ("/", "/clipboard"):
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                try:
                    body_decoded = body.decode("utf-8", errors="replace")
                    clip_data = json.loads(body_decoded)
                    log.info("Clipboard alindi | url={} | len={}".format(
                        clip_data.get("pageUrl"),
                        len(str(clip_data.get("data", "")))
                    ))
                    threading.Thread(
                        target=forward,
                        args=(clip_data, fmt, protocol, host, port, chunk_size),
                        daemon=True
                    ).start()
                    self._ok({"ok": True})
                except Exception as e:
                    log.error("Parse hatasi: {}".format(e))
                    self._err(str(e))
            else:
                self.send_response(404)
                self.end_headers()

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def _ok(self, obj):
            body = json.dumps(obj).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        def _err(self, msg):
            body = json.dumps({"ok": False, "error": msg}).encode()
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            log.debug("[Data] " + format % args)

    return DataHandler

# --- Main --------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="ClipSentinel Agent")
    parser.add_argument("--format",         choices=["json", "cef"], required=True)
    parser.add_argument("--protocol",       choices=["tcp", "udp"],  required=True)
    parser.add_argument("--target",         required=True, help="IP:PORT")
    parser.add_argument("--discovery-port", type=int, default=5000)
    parser.add_argument("--data-port",      type=int, default=5001)
    parser.add_argument("--chunk-size",     type=int, default=1200,
                        help="UDP max paket boyutu byte (varsayilan: 1200)")
    args = parser.parse_args()

    target_host, target_port = parse_target(args.target)

    log.info("Format     : {}".format(args.format.upper()))
    log.info("Protokol   : {}".format(args.protocol.upper()))
    log.info("Hedef      : {}:{}".format(target_host, target_port))
    log.info("Discovery  : :{}".format(args.discovery_port))
    log.info("Data port  : :{}".format(args.data_port))
    if args.protocol == "udp":
        log.info("Chunk size : {} bytes".format(args.chunk_size))

    # Discovery server
    disc_server = HTTPServer(("0.0.0.0", args.discovery_port), make_discovery_handler(args.data_port))
    threading.Thread(target=disc_server.serve_forever, daemon=True).start()
    log.info("Discovery server baslatildi → :{}".format(args.discovery_port))

    # Data server
    data_server = HTTPServer(
        ("0.0.0.0", args.data_port),
        make_data_handler(args.format, args.protocol, target_host, target_port, args.chunk_size)
    )
    log.info("Data server baslatildi → :{}/clipboard".format(args.data_port))

    try:
        data_server.serve_forever()
    except KeyboardInterrupt:
        log.info("Agent durduruluyor...")
        disc_server.shutdown()

if __name__ == "__main__":
    main()
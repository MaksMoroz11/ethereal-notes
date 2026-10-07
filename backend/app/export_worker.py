import json
import sys

from app.exporting import generate_docx, generate_pdf, parse_content


if __name__ == "__main__":
    payload = json.loads(sys.stdin.buffer.read())
    root = parse_content(payload["content"])
    generate = generate_pdf if payload["format"] == "pdf" else generate_docx
    sys.stdout.buffer.write(generate(payload["title"], root))

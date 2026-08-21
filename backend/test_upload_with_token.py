import requests

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODczMzkxNDAsInN1YiI6IjIifQ.KFfWIXI11_bePZQKlf6gNnhhlWl1gWzwMULO1SI_qaA"
headers = {"Authorization": f"Bearer {token}"}
files = {"file": ("test.pdf", b"%PDF-1.4...", "application/pdf")}
res = requests.post("http://localhost:8000/api/v1/assignments/2/upload-pdf", headers=headers, files=files)
print(res.status_code, res.text)

import os

try:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        genai.configure(api_key=api_key)
except ImportError:
    genai = None
    api_key = ""

def handle_student_doubt(classroom_id: int, student_id: int, doubt: str) -> str:
    prompt = f"You are Vidya Sathi's Student Doubt Solving Assistant. Answer this student doubt clearly: '{doubt}'"
    
    if not api_key:
        return f"Mock Agent Response: Let's solve this! To answer '{doubt}', you should review the concept of quadratic equations in your assignments."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error connecting to AI Agent. Auto-reply: Let's discuss this doubt in class."
